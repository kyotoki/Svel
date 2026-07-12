import { ENDPOINTS } from "../constants/api";
import { getSpeciesCategoryOption, Species, SPECIES, SpeciesCategory } from "../constants/marineLife";
import { cacheGbifSpecies } from "./gbifSpeciesCache";

export interface NearbySpeciesRecord {
  gbif_species_key: number;
  scientific_name: string | null;
  vernacular_name: string | null;
  occurrence_count: number;
  taxon_class: string | null;
}

type AuthedFetch = (input: string, init?: RequestInit) => Promise<Response>;

// Loose normalization for matching only (not for display or ids) - strips
// everything but letters/digits, so wording differences that don't change
// the species (spacing, hyphenation, punctuation - "White-tip Reef Shark"
// vs. "Whitetip Reef Shark") still match.
function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// GBIF's taxonomic class -> our species-picker category, used only for
// results GBIF returned that don't match anything in the curated
// vocabulary (see resolveNearbySpecies below) - a best-effort bucket so an
// unmatched species still lands somewhere sensible instead of everything
// unrecognized piling into "Other". Not exhaustive; anything not listed
// here (or with no class at all) falls back to "other".
const GBIF_CLASS_TO_CATEGORY: Record<string, SpeciesCategory> = {
  Elasmobranchii: "sharks_rays",
  Chondrichthyes: "sharks_rays",
  Actinopterygii: "fish",
  Osteichthyes: "fish",
  Reptilia: "reptiles",
  Mammalia: "marine_mammals",
  Cephalopoda: "cephalopods",
  Malacostraca: "crustaceans",
  Gastropoda: "mollusks",
  Bivalvia: "mollusks",
  Polyplacophora: "mollusks",
  Anthozoa: "corals",
  Hydrozoa: "corals",
};

function inferCategory(taxonClass: string | null): SpeciesCategory {
  return (taxonClass && GBIF_CLASS_TO_CATEGORY[taxonClass]) || "other";
}

// GBIF's nearby-species results carry a scientific name and, when present,
// a single English vernacular name - matched here against our curated
// list's commonName rather than scientific name/taxon key. The curated list
// only stores common names (see constants/marineLife.ts), and GBIF's
// species/match endpoint resolves scientific names, not vernacular ones, so
// this vernacular-name match is the option that needs no hand-authored
// scientific-name data for all ~264 curated entries.
//
// A record that doesn't match the curated list isn't dropped - the whole
// point of this feature is surfacing what's actually nearby, and plenty of
// real nearby species aren't in a necessarily-incomplete curated list. It's
// turned into an ad-hoc Species instead (id `gbif-<key>`, category inferred
// from GBIF's taxonomic class), selectable exactly like a curated one. This
// is a best-effort match either way: a record with no vernacular name at
// all just uses its scientific name for display, and normalization
// differences can still cause a real curated match to be missed - but never
// a wrong one, only a missed one (surfaced as its own ad-hoc entry instead).
export function resolveNearbySpecies(records: NearbySpeciesRecord[]): Species[] {
  const byNormalizedName = new Map<string, Species>();
  for (const species of SPECIES) {
    byNormalizedName.set(normalizeForMatch(species.commonName), species);
  }

  const seen = new Set<string>();
  const results: Species[] = [];
  for (const record of records) {
    const curated = record.vernacular_name ? byNormalizedName.get(normalizeForMatch(record.vernacular_name)) : undefined;
    const displayName = record.vernacular_name ?? record.scientific_name;

    let species: Species | undefined;
    if (curated) {
      species = curated;
    } else if (displayName) {
      const category = inferCategory(record.taxon_class);
      species = {
        id: `gbif-${record.gbif_species_key}`,
        commonName: displayName,
        category,
        emoji: getSpeciesCategoryOption(category).emoji,
      };
    }

    if (species && !seen.has(species.id)) {
      seen.add(species.id);
      results.push(species);
    }
  }
  return results;
}

// Fetches nearby GBIF species and returns them already resolved/ranked -
// never throws. The species picker's suggestions are an enrichment layer,
// not a hard dependency (GBIF being slow, unreachable, or having nothing
// for a remote location must never block or break species logging), so any
// failure just resolves to no suggestions rather than surfacing an error to
// the caller.
export async function fetchNearbySpecies(
  authedFetch: AuthedFetch,
  latitude: number,
  longitude: number,
  marineOnly: boolean
): Promise<Species[]> {
  try {
    const response = await authedFetch(ENDPOINTS.speciesNearby(latitude, longitude, marineOnly));
    if (!response.ok) {
      return [];
    }
    const records: NearbySpeciesRecord[] = await response.json();
    const species = resolveNearbySpecies(records);

    // Only the ad-hoc (non-curated) ones need caching - curated species
    // already resolve via constants/marineLife.ts everywhere.
    const adHoc = species.filter((s) => s.id.startsWith("gbif-"));
    if (adHoc.length > 0) {
      await cacheGbifSpecies(adHoc);
    }

    return species;
  } catch {
    return [];
  }
}
