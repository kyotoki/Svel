from unittest import mock

import httpx

import gbif_species


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeClient:
    """Stands in for httpx.Client's context-manager protocol, returning
    canned responses keyed by which endpoint was hit - the facet search vs.
    an individual /species/{key} lookup."""

    def __init__(self, responses_by_url_prefix):
        self._responses = responses_by_url_prefix

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, url, params=None):
        for prefix, response in self._responses.items():
            if url.startswith(prefix):
                if isinstance(response, Exception):
                    raise response
                return response
        raise AssertionError(f"Unexpected URL: {url}")


def _facet_response(counts):
    return _FakeResponse({"facets": [{"field": "SPECIES_KEY", "counts": counts}]})


def test_returns_species_ranked_by_occurrence_count():
    fake_client = _FakeClient(
        {
            gbif_species.OCCURRENCE_SEARCH_URL: _facet_response(
                [{"name": "2417522", "count": 500}, {"name": "165640762", "count": 120}]
            ),
            f"{gbif_species.SPECIES_LOOKUP_URL}/2417522": _FakeResponse(
                {"canonicalName": "Rhincodon typus", "vernacularName": "Whale Shark", "class": "Elasmobranchii"}
            ),
            f"{gbif_species.SPECIES_LOOKUP_URL}/165640762": _FakeResponse(
                {"canonicalName": "Chelonia mydas", "vernacularName": "Green Sea Turtle", "class": "Reptilia"}
            ),
        }
    )

    with mock.patch.object(gbif_species.httpx, "Client", return_value=fake_client):
        results = gbif_species.fetch_nearby_species(25.1, -80.2)

    assert results == [
        {
            "gbif_species_key": 2417522,
            "scientific_name": "Rhincodon typus",
            "vernacular_name": "Whale Shark",
            "occurrence_count": 500,
            "taxon_class": "Elasmobranchii",
        },
        {
            "gbif_species_key": 165640762,
            "scientific_name": "Chelonia mydas",
            "vernacular_name": "Green Sea Turtle",
            "occurrence_count": 120,
            "taxon_class": "Reptilia",
        },
    ]


def test_returns_empty_list_when_gbif_has_no_facets_for_the_location():
    fake_client = _FakeClient({gbif_species.OCCURRENCE_SEARCH_URL: _FakeResponse({"facets": []})})

    with mock.patch.object(gbif_species.httpx, "Client", return_value=fake_client):
        assert gbif_species.fetch_nearby_species(1.0, 2.0) == []


def test_returns_empty_list_on_network_error():
    fake_client = _FakeClient({gbif_species.OCCURRENCE_SEARCH_URL: httpx.ConnectError("boom")})

    with mock.patch.object(gbif_species.httpx, "Client", return_value=fake_client):
        assert gbif_species.fetch_nearby_species(1.0, 2.0) == []


def test_skips_a_single_species_whose_name_lookup_fails_but_keeps_the_rest():
    fake_client = _FakeClient(
        {
            gbif_species.OCCURRENCE_SEARCH_URL: _facet_response(
                [{"name": "111", "count": 50}, {"name": "222", "count": 10}]
            ),
            f"{gbif_species.SPECIES_LOOKUP_URL}/111": httpx.ConnectError("boom"),
            f"{gbif_species.SPECIES_LOOKUP_URL}/222": _FakeResponse(
                {"canonicalName": "Aliger gigas", "vernacularName": "Queen Conch"}
            ),
        }
    )

    with mock.patch.object(gbif_species.httpx, "Client", return_value=fake_client):
        results = gbif_species.fetch_nearby_species(1.0, 2.0)

    assert len(results) == 1
    assert results[0]["gbif_species_key"] == 222


def test_uses_the_configured_search_radius_and_kingdom_filter():
    fake_client = _FakeClient({gbif_species.OCCURRENCE_SEARCH_URL: _facet_response([])})
    captured = {}
    original_get = fake_client.get

    def spy_get(url, params=None):
        if url == gbif_species.OCCURRENCE_SEARCH_URL:
            captured["params"] = params
        return original_get(url, params)

    fake_client.get = spy_get

    with mock.patch.object(gbif_species.httpx, "Client", return_value=fake_client):
        gbif_species.fetch_nearby_species(25.1, -80.2)

    assert captured["params"]["geoDistance"] == f"25.1,-80.2,{gbif_species.SEARCH_RADIUS_KM}km"
    assert captured["params"]["kingdomKey"] == gbif_species.ANIMALIA_KINGDOM_KEY
