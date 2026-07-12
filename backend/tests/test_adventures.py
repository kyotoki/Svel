import models
from conftest import TestingSessionLocal, as_user, client, remove_auth_override, restore_auth_override


def create_dive(**overrides):
    payload = {
        "title": "Test Dive",
        "location_name": "Test Reef",
        "latitude": 1.0,
        "longitude": 2.0,
        "max_depth_meters": 15.0,
        "duration_minutes": 30,
        **overrides,
    }
    return client.post("/adventures/", json=payload)


def test_created_adventure_is_tagged_with_the_authenticated_user():
    as_user("user_a")
    resp = create_dive(title="A's Dive")
    assert resp.status_code == 201
    assert resp.json()["user_id"] == "user_a"


def test_list_only_returns_the_current_users_adventures():
    as_user("user_a")
    create_dive(title="A's Dive 1")
    create_dive(title="A's Dive 2")

    as_user("user_b")
    create_dive(title="B's Dive")

    resp = client.get("/adventures/")
    assert resp.status_code == 200
    titles = {a["title"] for a in resp.json()}
    assert titles == {"B's Dive"}

    as_user("user_a")
    resp = client.get("/adventures/")
    titles = {a["title"] for a in resp.json()}
    assert titles == {"A's Dive 1", "A's Dive 2"}


def test_cannot_read_another_users_adventure_by_id():
    as_user("user_a")
    dive_id = create_dive().json()["id"]

    as_user("user_b")
    resp = client.get(f"/adventures/{dive_id}")
    assert resp.status_code == 404


def test_cannot_delete_another_users_adventure():
    as_user("user_a")
    dive_id = create_dive().json()["id"]

    as_user("user_b")
    resp = client.delete(f"/adventures/{dive_id}")
    assert resp.status_code == 404

    as_user("user_a")
    resp = client.get(f"/adventures/{dive_id}")
    assert resp.status_code == 200


def test_owner_can_read_and_delete_their_own_adventure():
    as_user("user_a")
    dive_id = create_dive().json()["id"]

    resp = client.get(f"/adventures/{dive_id}")
    assert resp.status_code == 200

    resp = client.delete(f"/adventures/{dive_id}")
    assert resp.status_code == 204

    resp = client.get(f"/adventures/{dive_id}")
    assert resp.status_code == 404


def test_unauthenticated_requests_are_rejected():
    remove_auth_override()
    try:
        resp = client.get("/adventures/")
        assert resp.status_code in (401, 403)
    finally:
        restore_auth_override()


def test_list_defaults_to_returning_everything_under_the_page_size():
    as_user("user_a")
    for i in range(5):
        create_dive(title=f"Dive {i}", date=f"2026-01-0{i + 1}")

    resp = client.get("/adventures/")
    assert resp.status_code == 200
    assert len(resp.json()) == 5


def test_limit_caps_the_number_of_results():
    as_user("user_a")
    for i in range(5):
        create_dive(title=f"Dive {i}", date=f"2026-01-0{i + 1}")

    resp = client.get("/adventures/", params={"limit": 2})
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    # Newest-first (by date), same ordering as the unpaginated list.
    assert [a["title"] for a in resp.json()] == ["Dive 4", "Dive 3"]


def test_offset_moves_the_page_window():
    as_user("user_a")
    for i in range(5):
        create_dive(title=f"Dive {i}", date=f"2026-01-0{i + 1}")

    resp = client.get("/adventures/", params={"limit": 2, "offset": 2})
    assert resp.status_code == 200
    assert [a["title"] for a in resp.json()] == ["Dive 2", "Dive 1"]


def test_offset_past_the_end_returns_an_empty_list():
    as_user("user_a")
    create_dive()

    resp = client.get("/adventures/", params={"offset": 10})
    assert resp.status_code == 200
    assert resp.json() == []


def test_limit_beyond_the_max_page_size_is_rejected():
    as_user("user_a")
    resp = client.get("/adventures/", params={"limit": 101})
    assert resp.status_code == 422


def test_limit_and_offset_reject_out_of_range_values():
    as_user("user_a")
    assert client.get("/adventures/", params={"limit": 0}).status_code == 422
    assert client.get("/adventures/", params={"offset": -1}).status_code == 422


def test_species_defaults_to_an_empty_list():
    as_user("user_a")
    resp = create_dive()
    assert resp.json()["species"] == []


def test_species_round_trips_through_create_and_get():
    as_user("user_a")
    resp = create_dive(species=["fish-clownfish", "sharks_rays-whale-shark"])
    assert resp.status_code == 201
    assert sorted(resp.json()["species"]) == ["fish-clownfish", "sharks_rays-whale-shark"]

    dive_id = resp.json()["id"]
    get_resp = client.get(f"/adventures/{dive_id}")
    assert sorted(get_resp.json()["species"]) == ["fish-clownfish", "sharks_rays-whale-shark"]


def test_duplicate_species_ids_are_deduped_preserving_order():
    as_user("user_a")
    resp = create_dive(species=["fish-clownfish", "sharks_rays-whale-shark", "fish-clownfish"])
    assert resp.json()["species"] == ["fish-clownfish", "sharks_rays-whale-shark"]


def test_species_ids_are_not_validated_against_a_fixed_list():
    """species_id is an open string (same choice already made for
    activity_type) - the backend doesn't own or duplicate the frontend's
    curated species list, so an id it's never seen before is accepted as-is."""
    as_user("user_a")
    resp = create_dive(species=["some-future-species-not-yet-curated"])
    assert resp.status_code == 201
    assert resp.json()["species"] == ["some-future-species-not-yet-curated"]


def test_deleting_an_adventure_removes_its_species_rows():
    as_user("user_a")
    dive_id = create_dive(species=["fish-clownfish"]).json()["id"]

    resp = client.delete(f"/adventures/{dive_id}")
    assert resp.status_code == 204

    db = TestingSessionLocal()
    try:
        assert db.query(models.AdventureSpecies).filter_by(adventure_id=dive_id).count() == 0
    finally:
        db.close()


def test_two_adventures_can_tag_the_same_species_independently():
    as_user("user_a")
    first = create_dive(title="Dive 1", species=["fish-clownfish"]).json()
    second = create_dive(title="Dive 2", species=["fish-clownfish"]).json()

    assert first["species"] == ["fish-clownfish"]
    assert second["species"] == ["fish-clownfish"]
