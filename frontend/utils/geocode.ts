const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const WIKIPEDIA_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIDATA_URL = "https://www.wikidata.org/w/api.php";

// Wikipedia/Wikidata ask anonymous API clients to identify themselves with a
// descriptive User-Agent (unlike Nominatim, which just wants any UA at
// all) - a generic one gets more aggressively rate-limited.
const WIKI_USER_AGENT = "SvelApp/1.0 (https://svel.app; hello@svel.app)";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

// Nominatim (OSM) is address/administrative-place shaped - it's good at
// "Key West, Florida" and comes back completely empty for plenty of
// well-known natural dive/snorkel sites, because OSM's own tagged name for
// the place doesn't match how people actually refer to it (e.g. "Molokini
// Crater" - OSM has it tagged as "Molokini Shoal Marine Life Conservation
// District", so a literal-ish name search for the colloquial name finds
// nothing at all). Only falls through to the Wikipedia/Wikidata chain when
// Nominatim found nothing - Nominatim stays authoritative for the common
// address/city case it's actually good at, this only fills the gap.
export async function geocodeLocationName(query: string): Promise<GeocodeResult | null> {
  try {
    const nominatimResult = await searchNominatim(query);
    if (nominatimResult) {
      return nominatimResult;
    }
  } catch {
    // Falls through to the landmark search below rather than surfacing a
    // Nominatim-specific outage as "location not found" - a transient
    // Nominatim hiccup shouldn't block a query the Wikipedia/Wikidata
    // fallback could still resolve.
  }
  return await searchNamedLandmark(query);
}

async function searchNominatim(query: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_SEARCH_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SvelApp/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const results: { lat: string; lon: string }[] = await response.json();
  if (!results || results.length === 0) {
    return null;
  }

  const [top] = results;
  const latitude = Number(top.lat);
  const longitude = Number(top.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

// Three free, public, no-key-needed hops: Wikipedia's full-text search
// (the only one of the three that's genuinely fuzzy/relevance-ranked, so
// it's the one that resolves a colloquial query like "Molokini Crater" to
// the actual article title "Molokini"), then that article's Wikidata item
// id, then that item's coordinate-location claim (P625). Every notable
// natural landmark and dive/snorkel site that has a Wikipedia article at
// all almost always has a Wikidata item with real coordinates, even on the
// (fairly common) occasions the Wikipedia article itself doesn't expose a
// machine-readable coordinate of its own.
//
// Best-effort, same as the Nominatim path this backs up: any failure at
// any hop (a 429, a network error, a page with no coordinate data, a
// genuinely unmatched query) resolves to null, not a thrown error - a
// dead-end "location not found" the user can work around by switching to
// manual coordinates, never a crash.
async function searchNamedLandmark(query: string): Promise<GeocodeResult | null> {
  try {
    const title = await fetchWikipediaSearchTitle(query);
    if (!title) {
      return null;
    }
    const wikidataId = await fetchWikidataId(title);
    if (!wikidataId) {
      return null;
    }
    return await fetchWikidataCoordinates(wikidataId);
  } catch {
    return null;
  }
}

async function wikiGet(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": WIKI_USER_AGENT },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function fetchWikipediaSearchTitle(query: string): Promise<string | null> {
  const url = `${WIKIPEDIA_SEARCH_URL}?action=query&list=search&format=json&srlimit=1&origin=*&srsearch=${encodeURIComponent(query)}`;
  const data = await wikiGet(url);
  return data?.query?.search?.[0]?.title ?? null;
}

async function fetchWikidataId(title: string): Promise<string | null> {
  const url = `${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(title)}`;
  const data = await wikiGet(url);
  return data?.wikibase_item ?? null;
}

async function fetchWikidataCoordinates(wikidataId: string): Promise<GeocodeResult | null> {
  const url = `${WIKIDATA_URL}?action=wbgetclaims&entity=${wikidataId}&property=P625&format=json&origin=*`;
  const data = await wikiGet(url);
  const coord = data?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  if (!coord || typeof coord.latitude !== "number" || typeof coord.longitude !== "number") {
    return null;
  }
  return { latitude: coord.latitude, longitude: coord.longitude };
}
