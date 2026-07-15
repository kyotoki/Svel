from conftest import as_user, client, remove_auth_override, restore_auth_override


def upsert_profile(**overrides):
    payload = {
        "first_name": "Ada",
        "last_name": "Diver",
        "nickname": None,
        "country_code": None,
        "photo_url": None,
        **overrides,
    }
    return client.put("/profile/me", json=payload)


def test_missing_profile_returns_404_not_someone_elses():
    as_user("user_a")
    resp = client.get("/profile/me")
    assert resp.status_code == 404


def test_created_profile_is_tagged_with_the_authenticated_user():
    as_user("user_a")
    resp = upsert_profile(first_name="A")
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "user_a"


def test_cannot_read_another_users_profile():
    as_user("user_a")
    upsert_profile(first_name="A")

    as_user("user_b")
    resp = client.get("/profile/me")
    assert resp.status_code == 404


def test_put_always_targets_the_authenticated_user_even_if_a_user_id_is_smuggled_in():
    as_user("user_a")
    upsert_profile(first_name="A-original")

    as_user("user_b")
    # UserProfileCreate has no user_id field at all, so this extra key is
    # silently ignored by pydantic rather than doing anything - this test
    # exists to lock that in, not because the field is currently accepted.
    resp = client.put("/profile/me", json={
        "first_name": "B",
        "last_name": "Diver",
        "user_id": "user_a",
    })
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "user_b"

    as_user("user_a")
    resp = client.get("/profile/me")
    assert resp.json()["first_name"] == "A-original"


def test_put_updates_only_the_authenticated_users_own_profile():
    as_user("user_a")
    upsert_profile(first_name="A-original")
    as_user("user_b")
    upsert_profile(first_name="B-original")

    as_user("user_a")
    upsert_profile(first_name="A-updated")

    as_user("user_b")
    resp = client.get("/profile/me")
    assert resp.json()["first_name"] == "B-original"

    as_user("user_a")
    resp = client.get("/profile/me")
    assert resp.json()["first_name"] == "A-updated"


def test_bio_certifications_gear_and_home_country_round_trip():
    as_user("user_a")
    resp = upsert_profile(
        bio="Wreck diving enthusiast",
        certifications=["PADI Open Water", "PADI Advanced"],
        gear=[{"id": "1", "name": "Cressi Fins", "type": "fins"}],
        country_code="US",
        photo_url="https://pub-test.r2.dev/user_a/avatar.jpg",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["bio"] == "Wreck diving enthusiast"
    assert body["certifications"] == ["PADI Open Water", "PADI Advanced"]
    assert body["gear"] == [{"id": "1", "name": "Cressi Fins", "type": "fins"}]
    assert body["country_code"] == "US"
    assert body["photo_url"] == "https://pub-test.r2.dev/user_a/avatar.jpg"


def test_profile_fields_set_on_one_session_are_visible_from_a_different_session_for_the_same_account():
    # Simulates two devices/sessions for the same account: one client.put
    # call (device A writes), then a wholly separate client.get call
    # (device B reads) - no shared state between them beyond the backend
    # itself, the same standard used for the adventures/profile-edit
    # multi-device audit tests.
    as_user("user_a")
    upsert_profile(
        bio="Wreck diving enthusiast",
        certifications=["PADI Open Water"],
        gear=[{"id": "1", "name": "Cressi Fins", "type": "fins"}],
        country_code="US",
        photo_url="https://pub-test.r2.dev/user_a/avatar.jpg",
    )

    # A fresh read, as if from a second device that never made the write
    # above - the backend, not any client-side cache, is what's being
    # exercised here.
    resp = client.get("/profile/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["bio"] == "Wreck diving enthusiast"
    assert body["certifications"] == ["PADI Open Water"]
    assert body["gear"] == [{"id": "1", "name": "Cressi Fins", "type": "fins"}]
    assert body["country_code"] == "US"
    assert body["photo_url"] == "https://pub-test.r2.dev/user_a/avatar.jpg"


def test_certifications_and_gear_default_to_empty_lists_not_null():
    as_user("user_a")
    resp = upsert_profile()
    assert resp.status_code == 200
    body = resp.json()
    assert body["bio"] is None
    assert body["certifications"] == []
    assert body["gear"] == []


def test_updating_one_field_does_not_wipe_out_previously_set_fields_when_resent():
    # PUT is a full replace, not a patch - this test exists to lock in that
    # a caller resending the full current state (as the frontend now must)
    # correctly preserves it, not to test partial-update semantics that
    # don't exist here.
    as_user("user_a")
    upsert_profile(bio="Original bio", certifications=["PADI Open Water"])

    resp = upsert_profile(bio="Original bio", certifications=["PADI Open Water"], country_code="US")
    assert resp.status_code == 200
    body = resp.json()
    assert body["bio"] == "Original bio"
    assert body["certifications"] == ["PADI Open Water"]
    assert body["country_code"] == "US"


def test_unauthenticated_requests_are_rejected():
    remove_auth_override()
    try:
        resp = client.get("/profile/me")
        assert resp.status_code in (401, 403)
        resp = client.put("/profile/me", json={"first_name": "X", "last_name": "Y"})
        assert resp.status_code in (401, 403)
    finally:
        restore_auth_override()
