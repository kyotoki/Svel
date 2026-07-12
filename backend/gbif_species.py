import logging
from typing import Optional, TypedDict

import httpx

logger = logging.getLogger(__name__)

# GBIF (gbif.org) is used instead of querying OBIS directly - GBIF already
# aggregates OBIS's marine occurrence data alongside freshwater and
# terrestrial records under one API, so this same integration point can
# later serve a freshwater fishing feature by changing which curated species
# vocabulary results are matched against (see utils/nearbySpecies.ts on the
# frontend), not by adding a second data source here. Free, public, no
# API key or account required at this scale.
OCCURRENCE_SEARCH_URL = "https://api.gbif.org/v1/occurrence/search"
SPECIES_LOOKUP_URL = "https://api.gbif.org/v1/species"
REQUEST_TIMEOUT_SECONDS = 5.0

# Starting point, not a scientifically-tuned constant: wide enough to cover a
# reef system or a cluster of dive sites around one town/harbor, narrow
# enough that "nearby" still feels tied to this specific location rather
# than an entire coastline. Likely needs tuning per-region - a remote atoll
# with sparse GBIF coverage may want a wider radius than a heavily-surveyed
# reef destination.
SEARCH_RADIUS_KM = 50

# GBIF's backbone taxonomy kingdom key for Animalia - keeps occurrence
# results to animals, excluding plants/fungi/etc. Both today's marine
# curated species list and a future freshwater/fishing one are
# animals-only, so this filter is shared by both rather than being a
# marine-specific restriction.
ANIMALIA_KINGDOM_KEY = 1

# How many of a location's most-observed species (by occurrence count) to
# resolve full names for. GBIF's facet endpoint only returns numeric species
# keys, so each one needs a follow-up /species/{key} lookup - capping this
# bounds a cold cache miss to a few seconds instead of resolving GBIF's full
# facet page one at a time.
NAMES_TO_RESOLVE = 40


class NearbySpecies(TypedDict):
    gbif_species_key: int
    scientific_name: Optional[str]
    vernacular_name: Optional[str]
    occurrence_count: int
    # GBIF's taxonomic class (e.g. "Elasmobranchii", "Actinopterygii") - lets
    # the frontend infer a reasonable species-picker category for a result
    # that doesn't match anything in the curated vocabulary, rather than
    # dropping it or dumping everything unmatched into "Other" (see
    # utils/nearbySpecies.ts's category inference).
    taxon_class: Optional[str]


def fetch_nearby_species(latitude: float, longitude: float) -> list[NearbySpecies]:
    """Ask GBIF what animal species have occurrence records near this location,
    ranked by how many records each has (a rough proxy for how commonly it's
    been observed there).

    Returns [] on any failure or when GBIF has nothing nearby - this is a
    suggestion enrichment for the species picker, not a hard dependency, so a
    slow or unavailable upstream API must never block logging an adventure or
    break the picker's full curated list.
    """
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            counts = _fetch_nearby_species_key_counts(client, latitude, longitude)
            if not counts:
                return []

            results: list[NearbySpecies] = []
            for species_key, occurrence_count in counts:
                name_info = _resolve_species_name(client, species_key)
                if name_info is None:
                    continue
                results.append(
                    {
                        "gbif_species_key": species_key,
                        "scientific_name": name_info.get("canonicalName"),
                        "vernacular_name": name_info.get("vernacularName"),
                        "occurrence_count": occurrence_count,
                        "taxon_class": name_info.get("class"),
                    }
                )
            return results
    except (httpx.HTTPError, ValueError):
        logger.warning(
            "Unable to fetch nearby species for (%s, %s)", latitude, longitude, exc_info=True
        )
        return []


def _fetch_nearby_species_key_counts(
    client: httpx.Client, latitude: float, longitude: float
) -> list[tuple[int, int]]:
    """The distinct species keys GBIF has occurrence records for near this
    location, most-observed first. A facet query (limit=0) returns this
    directly as key/count pairs without paging through raw occurrence
    records, which would otherwise be dominated by whichever handful of
    species happen to be the most-photographed nearby."""
    response = client.get(
        OCCURRENCE_SEARCH_URL,
        params={
            "geoDistance": f"{latitude},{longitude},{SEARCH_RADIUS_KM}km",
            "kingdomKey": ANIMALIA_KINGDOM_KEY,
            "hasCoordinate": "true",
            "limit": 0,
            "facet": "speciesKey",
            "facetLimit": NAMES_TO_RESOLVE,
        },
    )
    response.raise_for_status()
    facets = response.json().get("facets", [])
    if not facets:
        return []
    return [(int(entry["name"]), entry["count"]) for entry in facets[0].get("counts", [])]


def _resolve_species_name(client: httpx.Client, species_key: int) -> Optional[dict]:
    # Caught per-key rather than letting this propagate to fetch_nearby_species's
    # outer handler - one species failing to resolve (a transient error, a
    # since-deleted taxon key, etc.) shouldn't discard every other species
    # already resolved for this location.
    try:
        response = client.get(f"{SPECIES_LOOKUP_URL}/{species_key}")
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError):
        logger.warning("Unable to resolve GBIF species %s", species_key, exc_info=True)
        return None
