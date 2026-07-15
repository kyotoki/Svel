import { Adventure } from "../../types/adventure";
import { computeDaysSinceLastLog, computeLongestActiveStretchDays, getMostRecentAdventureDate } from "../streaks";

function makeAdventure(id: number, date: string, createdAt?: string): Adventure {
  return {
    id,
    title: "Dive",
    date,
    time_of_day: null,
    created_at: createdAt ?? `${date}T12:00:00.000Z`,
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
    species: [],
  };
}

describe("computeLongestActiveStretchDays", () => {
  test("returns 0 for no adventures", () => {
    expect(computeLongestActiveStretchDays([])).toBe(0);
  });

  test("returns 1 for a single logged day", () => {
    expect(computeLongestActiveStretchDays([makeAdventure(1, "2026-07-01")])).toBe(1);
  });

  test("counts consecutive calendar days as one stretch", () => {
    const adventures = [
      makeAdventure(1, "2026-07-01"),
      makeAdventure(2, "2026-07-02"),
      makeAdventure(3, "2026-07-03"),
    ];
    expect(computeLongestActiveStretchDays(adventures)).toBe(3);
  });

  // The actual fix: a real dive trip (a rest day, a weathered-out day, a
  // planned surface interval) shouldn't reset the stretch just because
  // someone didn't log an adventure on literally every calendar day -
  // previously this would have counted as two separate 1-2 day streaks
  // instead of one 8-day stretch, making the streak achievements (see
  // achievements.ts's STREAK_TIERS) all but unreachable for trip-based
  // divers, which was the actual bug being fixed here.
  test("tolerates gaps of up to 2 days without breaking the stretch (a rest day on a dive trip)", () => {
    const adventures = [
      makeAdventure(1, "2026-07-01"),
      makeAdventure(2, "2026-07-02"),
      makeAdventure(3, "2026-07-04"), // one rest day skipped
      makeAdventure(4, "2026-07-05"),
      makeAdventure(5, "2026-07-08"), // two rest days skipped
    ];
    expect(computeLongestActiveStretchDays(adventures)).toBe(8);
  });

  test("a gap of more than 3 days breaks the stretch", () => {
    const adventures = [
      makeAdventure(1, "2026-07-01"),
      makeAdventure(2, "2026-07-02"),
      makeAdventure(3, "2026-07-10"),
    ];
    expect(computeLongestActiveStretchDays(adventures)).toBe(2);
  });

  test("returns the longest streak even if it isn't the most recent one", () => {
    const adventures = [
      makeAdventure(1, "2026-06-01"),
      makeAdventure(2, "2026-06-02"),
      makeAdventure(3, "2026-06-03"),
      makeAdventure(4, "2026-06-04"),
      makeAdventure(5, "2026-07-01"),
    ];
    expect(computeLongestActiveStretchDays(adventures)).toBe(4);
  });

  test("multiple adventures on the same day count once toward the streak", () => {
    const adventures = [
      makeAdventure(1, "2026-07-01"),
      makeAdventure(2, "2026-07-01"),
      makeAdventure(3, "2026-07-02"),
    ];
    expect(computeLongestActiveStretchDays(adventures)).toBe(2);
  });

  // The actual scenario from Month 4b's time-of-day feature: someone dives
  // earlier in the day, then doesn't get around to logging it until late
  // that night (or past midnight, into the next calendar day by wall-clock
  // time) - created_at reflects when they typed it in, not when they dove.
  // This must still attribute to the day they actually dove (`date`), or a
  // late log entry could silently break what would otherwise be a
  // continuous streak.
  test("a late-night log entry attributes to the dive's actual date, not the record's created_at", () => {
    const adventures = [
      makeAdventure(1, "2026-07-13"),
      // Dove on the 14th, but didn't log it until 2am on the 15th - a
      // realistic "logged it before bed, after midnight" scenario.
      makeAdventure(2, "2026-07-14", "2026-07-15T02:00:00.000Z"),
      makeAdventure(3, "2026-07-15"),
    ];
    // If this incorrectly grouped adventure 2 under the 15th (created_at's
    // date) instead of the 14th (its own date), two adventures would land
    // on the 15th and none on the 14th, breaking what is actually a clean
    // 3-day consecutive stretch (13th, 14th, 15th) into something shorter.
    expect(computeLongestActiveStretchDays(adventures)).toBe(3);
  });

  test("getMostRecentAdventureDate also uses date, not created_at", () => {
    const adventures = [
      makeAdventure(1, "2026-07-14", "2026-07-15T02:00:00.000Z"),
    ];
    // Not "2026-07-15", which is what created_at's date would give.
    expect(getMostRecentAdventureDate(adventures)).toBe("2026-07-14");
  });
});

describe("getMostRecentAdventureDate", () => {
  test("returns null for no adventures", () => {
    expect(getMostRecentAdventureDate([])).toBeNull();
  });

  test("returns the latest date regardless of array order", () => {
    const adventures = [
      makeAdventure(1, "2026-07-01"),
      makeAdventure(2, "2026-06-15"),
      makeAdventure(3, "2026-06-20"),
    ];
    expect(getMostRecentAdventureDate(adventures)).toBe("2026-07-01");
  });
});

describe("computeDaysSinceLastLog", () => {
  // Built from local Y/M/D args (not an ISO string, which parses as UTC and
  // can land on a different local calendar day depending on the test
  // runner's timezone) - matching how computeDaysSinceLastLog itself reads
  // `now` via local getters.
  const JULY_15_2026 = new Date(2026, 6, 15);

  test("returns null for no adventures", () => {
    expect(computeDaysSinceLastLog([], JULY_15_2026)).toBeNull();
  });

  test("returns 0 when the most recent adventure was logged today", () => {
    const adventures = [makeAdventure(1, "2026-07-15")];
    expect(computeDaysSinceLastLog(adventures, new Date(2026, 6, 15, 18))).toBe(0);
  });

  test("returns the whole-day gap since the most recent adventure", () => {
    const adventures = [makeAdventure(1, "2026-07-01")];
    expect(computeDaysSinceLastLog(adventures, JULY_15_2026)).toBe(14);
  });
});
