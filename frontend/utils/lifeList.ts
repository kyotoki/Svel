import { Species, SPECIES_CATEGORIES, SpeciesCategory } from "../constants/marineLife";
import { Adventure } from "../types/adventure";
import { resolveSpeciesById } from "./gbifSpeciesCache";

export interface LifeListEntry {
  species: Species;
  /** How many separate adventures this species was tagged on - a repeat
   * sighting, not a count of "how many individuals were seen" on one dive. */
  sightingCount: number;
  /** The earliest adventure date this species was logged on (YYYY-MM-DD). */
  firstLoggedDate: string;
}

export interface LifeListCategoryGroup {
  category: SpeciesCategory;
  entries: LifeListEntry[];
}

// Client-side aggregation from the full adventures list, matching how
// utils/achievements.ts already computes achievements from the same list
// rather than a dedicated backend endpoint - the data's already there, and
// this keeps GET /adventures/ the single source of truth.
export function buildLifeList(adventures: Adventure[]): LifeListCategoryGroup[] {
  const stats = new Map<string, { count: number; firstDate: string }>();

  for (const adventure of adventures) {
    // Defensive, not just belt-and-suspenders: `species` is typed as always
    // present, but real data can outlive the type that describes it (a
    // cached response from before this field existed, a mock in a test,
    // etc.) - falling back to [] keeps aggregation from crashing on
    // adventures that simply have nothing tagged. Deduped per-adventure so a
    // repeated id within one dive's own array (the backend already dedupes
    // on create, but this shouldn't assume that's the only path data can
    // arrive by) counts as a single sighting for that dive, not one per entry.
    for (const speciesId of new Set(adventure.species ?? [])) {
      const existing = stats.get(speciesId);
      if (existing) {
        existing.count += 1;
        if (adventure.date < existing.firstDate) {
          existing.firstDate = adventure.date;
        }
      } else {
        stats.set(speciesId, { count: 1, firstDate: adventure.date });
      }
    }
  }

  const groups: LifeListCategoryGroup[] = [];
  for (const categoryOption of SPECIES_CATEGORIES) {
    const entries: LifeListEntry[] = [];
    for (const [speciesId, { count, firstDate }] of stats) {
      const species = resolveSpeciesById(speciesId);
      // Skips silently rather than crashing - a species id from the curated
      // list that's since changed, or an ad-hoc GBIF id this device has
      // never cached (see utils/gbifSpeciesCache.ts), shouldn't break the
      // whole life list, it just won't have anything to render for.
      if (!species || species.category !== categoryOption.value) {
        continue;
      }
      entries.push({ species, sightingCount: count, firstLoggedDate: firstDate });
    }
    if (entries.length > 0) {
      entries.sort((a, b) => a.species.commonName.localeCompare(b.species.commonName));
      groups.push({ category: categoryOption.value, entries });
    }
  }
  return groups;
}

// "Same location" means the same location_name, trimmed/lowercased - the
// same practical proxy utils/achievements.ts's Globetrotter achievement
// already uses for "distinct locations" (no geocoded coordinates are stored,
// only a free-text name, so exact lat/lng matching isn't reliable enough:
// two logs of the same dive site rarely share identical GPS precision).
export function getAdventuresAtSameLocation(adventures: Adventure[], locationName: string): Adventure[] {
  const normalized = locationName.trim().toLowerCase();
  return adventures.filter((a) => a.location_name.trim().toLowerCase() === normalized);
}

export function countDistinctSpeciesLogged(adventures: Adventure[]): number {
  const ids = new Set<string>();
  for (const adventure of adventures) {
    // Defensive, not just belt-and-suspenders: `species` is typed as always
    // present, but real data can outlive the type that describes it (a
    // cached response from before this field existed, a mock in a test,
    // etc.) - falling back to [] keeps aggregation from crashing on
    // adventures that simply have nothing tagged.
    for (const speciesId of adventure.species ?? []) {
      ids.add(speciesId);
    }
  }
  return ids.size;
}
