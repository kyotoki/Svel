import AsyncStorage from "@react-native-async-storage/async-storage";

import { cacheGbifSpecies, resolveSpeciesById, whenGbifSpeciesCacheReady } from "../gbifSpeciesCache";

const NASSAU_GROUPER = { id: "gbif-999", commonName: "Nassau Grouper", category: "fish" as const, emoji: "🐠" };

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("resolves a curated species without ever touching the cache", () => {
  expect(resolveSpeciesById("fish-clownfish")?.commonName).toBe("Clownfish");
});

test("returns undefined for an id that's neither curated nor cached", () => {
  expect(resolveSpeciesById("gbif-not-cached")).toBeUndefined();
});

test("resolves an ad-hoc species once it's been cached", async () => {
  await cacheGbifSpecies([NASSAU_GROUPER]);
  expect(resolveSpeciesById("gbif-999")).toEqual(NASSAU_GROUPER);
});

test("persists to AsyncStorage so a fresh read of it reflects the cached species", async () => {
  const queenTriggerfish = { id: "gbif-1234", commonName: "Queen Triggerfish", category: "fish" as const, emoji: "🐠" };
  await cacheGbifSpecies([queenTriggerfish]);

  const raw = await AsyncStorage.getItem("svel:gbifSpeciesCache");
  expect(JSON.parse(raw as string)).toMatchObject({ "gbif-1234": queenTriggerfish });
});

test("a curated species id always resolves to the curated entry, even if somehow also cached", async () => {
  // Defensive case: should never happen in practice (curated ids are never
  // passed to cacheGbifSpecies), but the curated list must still win.
  await cacheGbifSpecies([{ id: "fish-clownfish", commonName: "Wrong Name", category: "fish", emoji: "🐠" }]);
  expect(resolveSpeciesById("fish-clownfish")?.commonName).toBe("Clownfish");
});

test("whenGbifSpeciesCacheReady resolves without throwing", async () => {
  await expect(whenGbifSpeciesCacheReady()).resolves.toBeUndefined();
});
