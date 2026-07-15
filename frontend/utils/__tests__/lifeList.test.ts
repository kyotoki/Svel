import { Adventure } from "../../types/adventure";
import { cacheGbifSpecies, whenGbifSpeciesCacheReady } from "../gbifSpeciesCache";
import {
  buildLifeList,
  countDistinctSpeciesLogged,
  getAdventuresAtSameLocation,
} from "../lifeList";

function makeAdventure(
  overrides: Partial<Adventure> & Pick<Adventure, "id" | "date"> & { species: string[] }
): Adventure {
  return {
    title: "Dive",
    time_of_day: null,
    created_at: `${overrides.date}T12:00:00.000Z`,
    location_name: "Test Site",
    latitude: 1,
    longitude: 2,
    max_depth_meters: 10,
    duration_minutes: 30,
    notes: null,
    photos: [],
    water_temp_c: null,
    wave_height_m: null,
    tide_height_m: null,
    activity_type: "scuba",
    tank_pressure_bar: null,
    gas_mix: null,
    ...overrides,
  };
}

describe("buildLifeList", () => {
  test("returns nothing for adventures with no species tagged", () => {
    const adventures = [makeAdventure({ id: 1, date: "2026-07-01", species: [] })];
    expect(buildLifeList(adventures)).toEqual([]);
  });

  test("groups species by category", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", species: ["fish-clownfish", "sharks_rays-whale-shark"] }),
    ];
    const groups = buildLifeList(adventures);

    expect(groups.map((g) => g.category)).toEqual(["fish", "sharks_rays"]);
    expect(groups[0].entries[0].species.commonName).toBe("Clownfish");
    expect(groups[1].entries[0].species.commonName).toBe("Whale Shark");
  });

  test("counts repeat sightings across separate adventures and tracks the earliest date", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-10", species: ["fish-clownfish"] }),
      makeAdventure({ id: 2, date: "2026-07-01", species: ["fish-clownfish"] }),
      makeAdventure({ id: 3, date: "2026-07-15", species: ["fish-clownfish"] }),
    ];
    const groups = buildLifeList(adventures);
    const entry = groups[0].entries[0];

    expect(entry.sightingCount).toBe(3);
    expect(entry.firstLoggedDate).toBe("2026-07-01");
  });

  test("does not double count the same species tagged twice on one adventure", () => {
    // Defense in depth - the backend already dedupes on create, but this
    // aggregation shouldn't assume that's the only path data can arrive by.
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", species: ["fish-clownfish", "fish-clownfish"] }),
    ];
    expect(buildLifeList(adventures)[0].entries[0].sightingCount).toBe(1);
  });

  test("skips unknown species ids rather than crashing", () => {
    const adventures = [makeAdventure({ id: 1, date: "2026-07-01", species: ["not-a-real-species-id"] })];
    expect(buildLifeList(adventures)).toEqual([]);
  });

  test("sorts entries within a category alphabetically by common name", () => {
    const adventures = [
      makeAdventure({
        id: 1,
        date: "2026-07-01",
        species: ["sharks_rays-tiger-shark", "sharks_rays-blue-shark"],
      }),
    ];
    const names = buildLifeList(adventures)[0].entries.map((e) => e.species.commonName);
    expect(names).toEqual(["Blue Shark", "Tiger Shark"]);
  });

  test("tolerates a missing species field (data predating this feature)", () => {
    const adventure = makeAdventure({ id: 1, date: "2026-07-01", species: [] });
    // @ts-expect-error - simulating a stale cached/legacy payload missing the field entirely
    delete adventure.species;
    expect(() => buildLifeList([adventure])).not.toThrow();
    expect(buildLifeList([adventure])).toEqual([]);
  });
});

describe("countDistinctSpeciesLogged", () => {
  test("counts each distinct species once regardless of how many adventures it appears on", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", species: ["fish-clownfish", "sharks_rays-whale-shark"] }),
      makeAdventure({ id: 2, date: "2026-07-02", species: ["fish-clownfish"] }),
    ];
    expect(countDistinctSpeciesLogged(adventures)).toBe(2);
  });

  test("returns 0 for no adventures", () => {
    expect(countDistinctSpeciesLogged([])).toBe(0);
  });
});

describe("getAdventuresAtSameLocation", () => {
  test("matches location names case-insensitively and trims whitespace", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", species: [], location_name: "Blue Hole" }),
      makeAdventure({ id: 2, date: "2026-07-02", species: [], location_name: "  blue hole  " }),
      makeAdventure({ id: 3, date: "2026-07-03", species: [], location_name: "Different Reef" }),
    ];

    const atBlueHole = getAdventuresAtSameLocation(adventures, "Blue Hole");
    expect(atBlueHole.map((a) => a.id)).toEqual([1, 2]);
  });

  test("returns an empty list when nothing matches", () => {
    const adventures = [makeAdventure({ id: 1, date: "2026-07-01", species: [], location_name: "Blue Hole" })];
    expect(getAdventuresAtSameLocation(adventures, "Nowhere")).toEqual([]);
  });
});

describe("buildLifeList with ad-hoc (non-curated, GBIF-sourced) species", () => {
  test("shows an ad-hoc species this device has cached, exactly like a curated one", async () => {
    await cacheGbifSpecies([
      { id: "gbif-999", commonName: "Nassau Grouper", category: "fish", emoji: "🐠" },
    ]);
    await whenGbifSpeciesCacheReady();

    const adventures = [makeAdventure({ id: 1, date: "2026-07-01", species: ["gbif-999"] })];
    const groups = buildLifeList(adventures);

    expect(groups).toEqual([
      {
        category: "fish",
        entries: [
          {
            species: { id: "gbif-999", commonName: "Nassau Grouper", category: "fish", emoji: "🐠" },
            sightingCount: 1,
            firstLoggedDate: "2026-07-01",
          },
        ],
      },
    ]);
  });

  test("still skips silently (not crashing) for a gbif- id this device has never cached", () => {
    const adventures = [makeAdventure({ id: 1, date: "2026-07-01", species: ["gbif-nonexistent"] })];
    expect(buildLifeList(adventures)).toEqual([]);
  });
});
