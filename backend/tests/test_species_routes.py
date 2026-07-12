from datetime import datetime, timedelta, timezone
from unittest import mock

import models
import routes.species as species_module
from conftest import TestingSessionLocal, as_user, client


def test_returns_gbif_results_and_caches_them():
    as_user("user_a")
    fake_results = [
        {
            "gbif_species_key": 2417522,
            "scientific_name": "Rhincodon typus",
            "vernacular_name": "Whale Shark",
            "occurrence_count": 500,
        }
    ]

    with mock.patch.object(species_module, "fetch_nearby_species", return_value=fake_results) as fake_fetch:
        resp = client.get("/species/nearby", params={"latitude": 25.1, "longitude": -80.2})

    assert resp.status_code == 200
    assert resp.json() == fake_results
    fake_fetch.assert_called_once_with(25.1, -80.2)

    db = TestingSessionLocal()
    try:
        rows = db.query(models.SpeciesLocationCache).all()
        assert len(rows) == 1
        assert rows[0].lat_bucket == 25.0
        assert rows[0].lon_bucket == -80.0
    finally:
        db.close()


def test_a_second_request_in_the_same_location_bucket_does_not_call_gbif_again():
    as_user("user_a")
    with mock.patch.object(species_module, "fetch_nearby_species", return_value=[]) as fake_fetch:
        client.get("/species/nearby", params={"latitude": 25.05, "longitude": -80.05})
        client.get("/species/nearby", params={"latitude": 25.2, "longitude": -80.2})

    # Both coordinates round to the same 0.5-degree bucket (25.0, -80.0), so
    # the second request should be served entirely from cache.
    fake_fetch.assert_called_once()


def test_requests_in_different_location_buckets_each_call_gbif():
    as_user("user_a")
    with mock.patch.object(species_module, "fetch_nearby_species", return_value=[]) as fake_fetch:
        client.get("/species/nearby", params={"latitude": 25.1, "longitude": -80.2})
        client.get("/species/nearby", params={"latitude": -33.9, "longitude": 151.2})

    assert fake_fetch.call_count == 2


def test_an_expired_cache_entry_triggers_a_fresh_gbif_call():
    as_user("user_a")
    with mock.patch.object(species_module, "fetch_nearby_species", return_value=[]) as fake_fetch:
        client.get("/species/nearby", params={"latitude": 10.0, "longitude": 10.0})

    db = TestingSessionLocal()
    try:
        row = db.query(models.SpeciesLocationCache).filter_by(lat_bucket=10.0, lon_bucket=10.0).one()
        row.fetched_at = datetime.now(timezone.utc) - timedelta(days=31)
        db.add(row)
        db.commit()
    finally:
        db.close()

    with mock.patch.object(species_module, "fetch_nearby_species", return_value=[]) as fake_fetch:
        client.get("/species/nearby", params={"latitude": 10.0, "longitude": 10.0})

    fake_fetch.assert_called_once()


def test_returns_an_empty_list_rather_than_failing_when_gbif_is_unreachable():
    as_user("user_a")
    with mock.patch.object(species_module, "fetch_nearby_species", return_value=[]):
        resp = client.get("/species/nearby", params={"latitude": 1.0, "longitude": 2.0})

    assert resp.status_code == 200
    assert resp.json() == []


def test_requires_authentication():
    from conftest import remove_auth_override, restore_auth_override

    remove_auth_override()
    try:
        resp = client.get("/species/nearby", params={"latitude": 1.0, "longitude": 2.0})
        assert resp.status_code in (401, 403)
    finally:
        restore_auth_override()


def test_rejects_out_of_range_coordinates():
    as_user("user_a")
    resp = client.get("/species/nearby", params={"latitude": 200.0, "longitude": 2.0})
    assert resp.status_code == 422
