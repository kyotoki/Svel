import { geocodeLocationName } from "../geocode";

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function mockByUrl(handlers: { match: string; response: any }[]) {
  fetchMock.mockImplementation((url: string) => {
    const handler = handlers.find((h) => url.includes(h.match));
    if (!handler) {
      throw new Error(`Unexpected URL in test: ${url}`);
    }
    return Promise.resolve(handler.response);
  });
}

test("returns Nominatim's top result when it finds something (unchanged common case)", async () => {
  mockByUrl([{ match: "nominatim.openstreetmap.org", response: jsonResponse([{ lat: "24.5", lon: "-81.8" }]) }]);

  const result = await geocodeLocationName("Key West, Florida");
  expect(result).toEqual({ latitude: 24.5, longitude: -81.8 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("falls back to the Wikipedia/Wikidata chain when Nominatim finds nothing", async () => {
  mockByUrl([
    { match: "nominatim.openstreetmap.org", response: jsonResponse([]) },
    {
      match: "en.wikipedia.org/w/api.php",
      response: jsonResponse({ query: { search: [{ title: "Molokini" }] } }),
    },
    {
      match: "en.wikipedia.org/api/rest_v1/page/summary",
      response: jsonResponse({ wikibase_item: "Q1225759" }),
    },
    {
      match: "wikidata.org",
      response: jsonResponse({
        claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: 20.63, longitude: -156.49 } } } }] },
      }),
    },
  ]);

  const result = await geocodeLocationName("Molokini Crater");
  expect(result).toEqual({ latitude: 20.63, longitude: -156.49 });
});

test("falls back to the landmark chain when Nominatim itself errors, rather than failing outright", async () => {
  mockByUrl([
    { match: "nominatim.openstreetmap.org", response: jsonResponse(null, false) },
    {
      match: "en.wikipedia.org/w/api.php",
      response: jsonResponse({ query: { search: [{ title: "Great Blue Hole" }] } }),
    },
    {
      match: "en.wikipedia.org/api/rest_v1/page/summary",
      response: jsonResponse({ wikibase_item: "Q1027655" }),
    },
    {
      match: "wikidata.org",
      response: jsonResponse({
        claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: 17.31, longitude: -87.53 } } } }] },
      }),
    },
  ]);

  const result = await geocodeLocationName("Great Blue Hole");
  expect(result).toEqual({ latitude: 17.31, longitude: -87.53 });
});

test("returns null (not a throw) when Wikipedia search finds nothing either", async () => {
  mockByUrl([
    { match: "nominatim.openstreetmap.org", response: jsonResponse([]) },
    { match: "en.wikipedia.org/w/api.php", response: jsonResponse({ query: { search: [] } }) },
  ]);

  await expect(geocodeLocationName("asdkjaslkdjaslkd nonsense")).resolves.toBeNull();
});

test("returns null when the matched Wikipedia article has no linked Wikidata item", async () => {
  mockByUrl([
    { match: "nominatim.openstreetmap.org", response: jsonResponse([]) },
    {
      match: "en.wikipedia.org/w/api.php",
      response: jsonResponse({ query: { search: [{ title: "Some Article" }] } }),
    },
    { match: "en.wikipedia.org/api/rest_v1/page/summary", response: jsonResponse({}) },
  ]);

  await expect(geocodeLocationName("some query")).resolves.toBeNull();
});

test("returns null when the Wikidata item has no coordinate-location claim", async () => {
  mockByUrl([
    { match: "nominatim.openstreetmap.org", response: jsonResponse([]) },
    {
      match: "en.wikipedia.org/w/api.php",
      response: jsonResponse({ query: { search: [{ title: "Some Article" }] } }),
    },
    { match: "en.wikipedia.org/api/rest_v1/page/summary", response: jsonResponse({ wikibase_item: "Q999" }) },
    { match: "wikidata.org", response: jsonResponse({ claims: {} }) },
  ]);

  await expect(geocodeLocationName("some query")).resolves.toBeNull();
});

test("returns null (not a throw) when every step in the fallback chain fails outright", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await expect(geocodeLocationName("anything")).resolves.toBeNull();
});

test("returns null when Nominatim returns coordinates that fail to parse as numbers", async () => {
  mockByUrl([
    { match: "nominatim.openstreetmap.org", response: jsonResponse([{ lat: "not-a-number", lon: "-81.8" }]) },
    { match: "en.wikipedia.org/w/api.php", response: jsonResponse({ query: { search: [] } }) },
  ]);

  await expect(geocodeLocationName("weird result")).resolves.toBeNull();
});
