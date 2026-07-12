import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSpeciesById, Species } from "../constants/marineLife";

const STORAGE_KEY = "svel:gbifSpeciesCache";

// In-memory mirror of AsyncStorage, so resolveSpeciesById can stay
// synchronous - it's called from render-time aggregation (life list,
// achievements, the map's per-pin species view - see utils/lifeList.ts),
// none of which are written to sit behind a loading state the way an async
// lookup would require.
let cache: Record<string, Species> = {};

// Fired once, at module load, rather than lazily on first read - by the
// time any screen actually needs to resolve an id, this has almost always
// already finished (an AsyncStorage read takes single-digit milliseconds).
// A read before it resolves just means resolveSpeciesById treats an ad-hoc
// species as unknown for one frame, not a crash - it self-heals on the next
// render once hydration completes.
const hydration = AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw) {
      cache = JSON.parse(raw);
    }
  })
  .catch(() => {
    // Best-effort - an unreadable cache just means ad-hoc GBIF species
    // resolve as unknown until the user re-opens the picker near the same
    // location, not a crash.
  });

// Exposed so tests (and any caller that genuinely needs a guarantee) can
// await the cache being readable before asserting on resolveSpeciesById.
export function whenGbifSpeciesCacheReady(): Promise<void> {
  return hydration;
}

// Persists species the species picker surfaced from GBIF that aren't part
// of the curated vocabulary (see utils/nearbySpecies.ts) - without this,
// an adventure tagged with one of these would show a real name/emoji in the
// picker at the moment it's picked, then silently disappear from the life
// list, achievements, and the map's "species spotted here" section the
// moment that screen re-derives its data from scratch, since none of them
// have any other way to know what a "gbif-12345" id means.
//
// Device-local (AsyncStorage), matching this app's existing offline-first
// storage pattern (utils/adventureQueue.ts) - resolves correctly on
// whichever device the species was ever suggested/picked on. A different
// device logging into the same account wouldn't yet have this id cached
// until GBIF suggests it there too (or the user reopens the picker at that
// same location on that device) - an acceptable gap for a personal-scale,
// mostly-single-device app, not a silent wrong answer (still just an
// unresolved id, handled the same as any other unrecognized one).
export async function cacheGbifSpecies(species: Species[]): Promise<void> {
  await hydration;
  let changed = false;
  for (const s of species) {
    if (cache[s.id]?.commonName !== s.commonName) {
      cache[s.id] = s;
      changed = true;
    }
  }
  if (changed) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
}

// The single resolver every consumer (life list, achievements, map) should
// use instead of constants/marineLife.ts's getSpeciesById directly - checks
// the curated vocabulary first, then this device's cache of ad-hoc GBIF
// species it's previously seen.
export function resolveSpeciesById(id: string): Species | undefined {
  return getSpeciesById(id) ?? cache[id];
}
