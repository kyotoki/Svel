import { Adventure } from "../../types/adventure";
import { buildMonthDistribution, buildPersonalRecordsTimeline, buildYearOverYearStats } from "../proStats";

function makeAdventure(
  overrides: Partial<Adventure> & Pick<Adventure, "id" | "date" | "max_depth_meters" | "duration_minutes">
): Adventure {
  return {
    title: "Dive",
    created_at: `${overrides.date}T12:00:00.000Z`,
    location_name: "Test Site",
    latitude: 1,
    longitude: 2,
    notes: null,
    photos: [],
    water_temp_c: null,
    wave_height_m: null,
    tide_height_m: null,
    activity_type: "scuba",
    tank_pressure_bar: null,
    gas_mix: null,
    species: [],
    ...overrides,
  };
}

describe("buildYearOverYearStats", () => {
  test("groups by year, most recent first", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2024-03-01", max_depth_meters: 10, duration_minutes: 30 }),
      makeAdventure({ id: 2, date: "2025-06-01", max_depth_meters: 20, duration_minutes: 40 }),
      makeAdventure({ id: 3, date: "2025-07-01", max_depth_meters: 25, duration_minutes: 50 }),
    ];
    const result = buildYearOverYearStats(adventures);

    expect(result.map((y) => y.year)).toEqual([2025, 2024]);
    expect(result[0]).toEqual({ year: 2025, totalTrips: 2, totalMinutes: 90, deepestMeters: 25 });
    expect(result[1]).toEqual({ year: 2024, totalTrips: 1, totalMinutes: 30, deepestMeters: 10 });
  });

  test("returns an empty array for no adventures", () => {
    expect(buildYearOverYearStats([])).toEqual([]);
  });
});

describe("buildPersonalRecordsTimeline", () => {
  test("emits a record entry each time a new best is set, in chronological order", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-01-01", max_depth_meters: 10, duration_minutes: 30 }),
      makeAdventure({ id: 2, date: "2026-02-01", max_depth_meters: 18, duration_minutes: 25 }), // deeper, shorter
      makeAdventure({ id: 3, date: "2026-03-01", max_depth_meters: 15, duration_minutes: 45 }), // shallower, longer
    ];
    const records = buildPersonalRecordsTimeline(adventures);

    // Most recent first: the duration PR from March, then the depth PR from
    // February, then both initial PRs from January.
    expect(records).toEqual([
      { metric: "duration", value: 45, date: "2026-03-01", adventureId: 3, adventureTitle: "Dive" },
      { metric: "depth", value: 18, date: "2026-02-01", adventureId: 2, adventureTitle: "Dive" },
      { metric: "duration", value: 30, date: "2026-01-01", adventureId: 1, adventureTitle: "Dive" },
      { metric: "depth", value: 10, date: "2026-01-01", adventureId: 1, adventureTitle: "Dive" },
    ]);
  });

  test("does not re-emit a record for a dive that ties but doesn't beat the current best", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-01-01", max_depth_meters: 20, duration_minutes: 30 }),
      makeAdventure({ id: 2, date: "2026-01-02", max_depth_meters: 20, duration_minutes: 30 }),
    ];
    const records = buildPersonalRecordsTimeline(adventures);
    expect(records.filter((r) => r.metric === "depth")).toHaveLength(1);
    expect(records.filter((r) => r.metric === "duration")).toHaveLength(1);
  });

  test("returns an empty array for no adventures", () => {
    expect(buildPersonalRecordsTimeline([])).toEqual([]);
  });
});

describe("buildMonthDistribution", () => {
  test("buckets adventures into their calendar month across all years", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2024-01-15", max_depth_meters: 10, duration_minutes: 30 }),
      makeAdventure({ id: 2, date: "2025-01-20", max_depth_meters: 10, duration_minutes: 30 }),
      makeAdventure({ id: 3, date: "2025-07-04", max_depth_meters: 10, duration_minutes: 30 }),
    ];
    const result = buildMonthDistribution(adventures);

    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ month: 0, count: 2 }); // January
    expect(result[6]).toEqual({ month: 6, count: 1 }); // July
    expect(result[11]).toEqual({ month: 11, count: 0 }); // December
  });

  test("returns 12 zeroed buckets for no adventures", () => {
    const result = buildMonthDistribution([]);
    expect(result).toHaveLength(12);
    expect(result.every((b) => b.count === 0)).toBe(true);
  });
});
