import { Adventure } from "../../types/adventure";
import { buildAchievements } from "../achievements";

function makeAdventure(overrides: Partial<Adventure> & Pick<Adventure, "id" | "date" | "activity_type">): Adventure {
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
    tank_pressure_bar: null,
    gas_mix: null,
    species: [],
    ...overrides,
  };
}

describe("buildAchievements - streaks", () => {
  test("streak achievements are locked with no adventures", () => {
    const { streaks } = buildAchievements([], [], []);
    expect(streaks).toHaveLength(2);
    expect(streaks.every((a) => !a.unlocked)).toBe(true);
  });

  test("a 7-day streak unlocks the weekly tier but not the monthly one", () => {
    const adventures = Array.from({ length: 7 }, (_, i) =>
      makeAdventure({ id: i, date: `2026-07-0${i + 1}`, activity_type: "scuba" })
    );
    const { streaks } = buildAchievements(adventures, [], []);
    const weekly = streaks.find((a) => a.id === "streak-7");
    const monthly = streaks.find((a) => a.id === "streak-30");
    expect(weekly?.unlocked).toBe(true);
    expect(monthly?.unlocked).toBe(false);
  });

  // The actual scenario the streak fix targets: a realistic dive trip with
  // rest days mixed in, not perfect daily logging - previously this
  // wouldn't have unlocked "Weekly Rhythm" at all (see streaks.test.ts).
  test("a week-long trip with a couple of rest days still unlocks the weekly tier", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", activity_type: "scuba" }),
      makeAdventure({ id: 2, date: "2026-07-02", activity_type: "scuba" }),
      makeAdventure({ id: 3, date: "2026-07-04", activity_type: "scuba" }),
      makeAdventure({ id: 4, date: "2026-07-07", activity_type: "scuba" }),
    ];
    const { streaks } = buildAchievements(adventures, [], []);
    expect(streaks.find((a) => a.id === "streak-7")?.unlocked).toBe(true);
  });
});

describe("buildAchievements - per-activity depth/time milestones", () => {
  test("depth and time achievements are appended per activity type and stay locked below threshold", () => {
    const adventures = [makeAdventure({ id: 1, date: "2026-07-01", activity_type: "scuba", max_depth_meters: 12, duration_minutes: 40 })];
    const { scuba } = buildAchievements(adventures, [], []);

    const depth = scuba.find((a) => a.id === "scuba-depth-30");
    const time = scuba.find((a) => a.id === "scuba-time-600");
    expect(depth?.unlocked).toBe(false);
    expect(time?.unlocked).toBe(false);
  });

  test("depth and time achievements unlock once a type's totals cross their threshold", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", activity_type: "freediving", max_depth_meters: 25, duration_minutes: 200 }),
    ];
    const { freediving } = buildAchievements(adventures, [], []);

    const depth = freediving.find((a) => a.id === "freediving-depth-20");
    expect(depth?.unlocked).toBe(true);

    const time = freediving.find((a) => a.id === "freediving-time-180");
    expect(time?.unlocked).toBe(true);
  });

  test("activity types don't leak into each other's milestones", () => {
    const adventures = [
      makeAdventure({ id: 1, date: "2026-07-01", activity_type: "scuba", max_depth_meters: 40, duration_minutes: 700 }),
    ];
    const { snorkel, freediving } = buildAchievements(adventures, [], []);

    expect(snorkel.find((a) => a.id === "snorkeling-depth-5")?.unlocked).toBe(false);
    expect(freediving.find((a) => a.id === "freediving-depth-20")?.unlocked).toBe(false);
  });
});

describe("buildAchievements - Night Owl (created_at vs time_of_day)", () => {
  // The actual bug fixed by Month 4b's time-of-day field: previously "night"
  // could only be read from created_at (when the entry was typed in), so a
  // daytime dive logged late at night would incorrectly unlock Night Owl,
  // and a genuine night dive logged the next morning would incorrectly miss
  // it. time_of_day (the dive's own logged time), when set, is now the
  // real signal - created_at is only a fallback for adventures with no
  // time set at all.
  test("a daytime dive logged late at night does NOT unlock Night Owl", () => {
    const adventures = [
      makeAdventure({
        id: 1,
        date: "2026-07-01",
        activity_type: "scuba",
        time_of_day: "14:00", // actually dove at 2pm
        created_at: "2026-07-01T23:30:00.000Z", // but typed it in at 11:30pm
      }),
    ];
    const { global } = buildAchievements(adventures, [], []);
    expect(global.find((a) => a.id === "global-nightowl")?.unlocked).toBe(false);
  });

  test("a genuine night dive logged the next morning DOES unlock Night Owl", () => {
    const adventures = [
      makeAdventure({
        id: 1,
        date: "2026-07-01",
        activity_type: "scuba",
        time_of_day: "20:00", // actually dove at 8pm
        created_at: "2026-07-02T09:00:00.000Z", // but typed it in the next morning
      }),
    ];
    const { global } = buildAchievements(adventures, [], []);
    expect(global.find((a) => a.id === "global-nightowl")?.unlocked).toBe(true);
  });

  test("falls back to created_at's hour when no time_of_day was set (legacy/untimed entries)", () => {
    // isLoggedAtNight reads created_at via local getHours(), so this is
    // built from local Y/M/D/H args (not a hardcoded UTC ISO string, which
    // would parse back to a different local hour - and therefore a
    // different night/day verdict - depending on the test runner's
    // timezone; same reasoning as streaks.test.ts's computeDaysSinceLastLog
    // tests).
    const lateNightLocal = new Date(2026, 6, 1, 23, 30).toISOString();
    const adventures = [
      makeAdventure({
        id: 1,
        date: "2026-07-01",
        activity_type: "scuba",
        time_of_day: null,
        created_at: lateNightLocal,
      }),
    ];
    const { global } = buildAchievements(adventures, [], []);
    expect(global.find((a) => a.id === "global-nightowl")?.unlocked).toBe(true);
  });
});
