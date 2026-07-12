import { whenGbifSpeciesCacheReady, resolveSpeciesById } from "../gbifSpeciesCache";
import { fetchNearbySpecies, NearbySpeciesRecord, resolveNearbySpecies } from "../nearbySpecies";

function makeRecord(overrides: Partial<NearbySpeciesRecord>): NearbySpeciesRecord {
  return {
    gbif_species_key: 1,
    scientific_name: "Rhincodon typus",
    vernacular_name: "Whale Shark",
    occurrence_count: 10,
    taxon_class: "Elasmobranchii",
    ...overrides,
  };
}

describe("resolveNearbySpecies", () => {
  test("matches records against the curated list by vernacular name, ranked in the order given", () => {
    const records = [
      makeRecord({ gbif_species_key: 1, vernacular_name: "Whale Shark", occurrence_count: 500 }),
      makeRecord({ gbif_species_key: 2, vernacular_name: "Clownfish", occurrence_count: 120, taxon_class: "Actinopterygii" }),
    ];

    const results = resolveNearbySpecies(records);

    expect(results.map((s) => s.commonName)).toEqual(["Whale Shark", "Clownfish"]);
    // Curated matches keep their stable curated id, not a gbif-prefixed one.
    expect(results.map((s) => s.id)).toEqual(["sharks_rays-whale-shark", "fish-clownfish"]);
  });

  test("matches are tolerant of casing, spacing and punctuation differences", () => {
    const records = [makeRecord({ vernacular_name: "green sea-turtle", taxon_class: "Reptilia" })];
    const results = resolveNearbySpecies(records);
    expect(results.map((s) => s.commonName)).toEqual(["Green Sea Turtle"]);
  });

  test("a record that doesn't match the curated list becomes its own ad-hoc, selectable species", () => {
    const records = [
      makeRecord({
        gbif_species_key: 999,
        vernacular_name: "Nassau Grouper",
        scientific_name: "Epinephelus striatus",
        taxon_class: "Actinopterygii",
      }),
    ];

    const results = resolveNearbySpecies(records);

    expect(results).toEqual([
      {
        id: "gbif-999",
        commonName: "Nassau Grouper",
        category: "fish",
        emoji: expect.any(String),
      },
    ]);
  });

  test("infers a sensible category from GBIF's taxonomic class for unmatched records", () => {
    const records = [
      makeRecord({ gbif_species_key: 1, vernacular_name: "Something Unlisted", taxon_class: "Elasmobranchii" }),
      makeRecord({ gbif_species_key: 2, vernacular_name: "Also Unlisted", taxon_class: "Gastropoda" }),
      makeRecord({ gbif_species_key: 3, vernacular_name: "Totally Unknown", taxon_class: null }),
    ];

    const results = resolveNearbySpecies(records);

    expect(results.map((s) => s.category)).toEqual(["sharks_rays", "mollusks", "other"]);
  });

  test("falls back to scientific name when there's no vernacular name, rather than dropping the record", () => {
    const records = [makeRecord({ gbif_species_key: 42, vernacular_name: null, scientific_name: "Epinephelus striatus" })];
    const results = resolveNearbySpecies(records);
    expect(results).toEqual([{ id: "gbif-42", commonName: "Epinephelus striatus", category: "sharks_rays", emoji: expect.any(String) }]);
  });

  test("skips a record with neither a vernacular nor a scientific name", () => {
    const records = [makeRecord({ vernacular_name: null, scientific_name: null })];
    expect(resolveNearbySpecies(records)).toEqual([]);
  });

  test("does not return the same species twice even if GBIF sends duplicate names", () => {
    const records = [
      makeRecord({ gbif_species_key: 1, vernacular_name: "Whale Shark" }),
      makeRecord({ gbif_species_key: 2, vernacular_name: "Whale Shark" }),
    ];
    expect(resolveNearbySpecies(records)).toHaveLength(1);
  });
});

describe("fetchNearbySpecies", () => {
  test("returns resolved species on a successful response", async () => {
    const fakeFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeRecord({ vernacular_name: "Whale Shark" })],
    });

    const results = await fetchNearbySpecies(fakeFetch, 25.1, -80.2, true);

    expect(results.map((s) => s.commonName)).toEqual(["Whale Shark"]);
    expect(fakeFetch).toHaveBeenCalledWith(expect.stringContaining("latitude=25.1"));
    expect(fakeFetch).toHaveBeenCalledWith(expect.stringContaining("longitude=-80.2"));
    expect(fakeFetch).toHaveBeenCalledWith(expect.stringContaining("marine_only=true"));
  });

  test("resolves to an empty list rather than throwing when the request fails outright", async () => {
    const fakeFetch = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
    await expect(fetchNearbySpecies(fakeFetch, 1, 2, true)).resolves.toEqual([]);
  });

  test("resolves to an empty list when the server responds with an error status", async () => {
    const fakeFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchNearbySpecies(fakeFetch, 1, 2, true)).resolves.toEqual([]);
  });

  test("caches ad-hoc (non-curated) species so they resolve later even without another GBIF fetch", async () => {
    const fakeFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        makeRecord({
          gbif_species_key: 12345,
          vernacular_name: "Some Uncurated Fish",
          taxon_class: "Actinopterygii",
        }),
      ],
    });

    await fetchNearbySpecies(fakeFetch, 1, 2, true);
    await whenGbifSpeciesCacheReady();

    expect(resolveSpeciesById("gbif-12345")).toEqual({
      id: "gbif-12345",
      commonName: "Some Uncurated Fish",
      category: "fish",
      emoji: expect.any(String),
    });
  });
});
