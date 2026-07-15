import { readJSON, writeJSON } from "./deviceStorage";

export interface GearItem {
  id: string;
  name: string;
  type: string;
}

export interface LocalProfileFields {
  bio: string;
  homeCountryCode: string | null;
  certifications: string[];
  gear: GearItem[];
  photoUri: string | null;
}

export const DEFAULT_LOCAL_PROFILE: LocalProfileFields = {
  bio: "",
  homeCountryCode: null,
  certifications: [],
  gear: [],
  photoUri: null,
};

// This is now a cache, not the source of truth: bio/homeCountryCode/
// certifications/gear/photoUri all live on the backend's user_profiles
// table (see routes/profile.py) as of Month 4b - hooks/useProfileData.ts
// fetches from there and writes through on every edit, falling back to
// (and reconciling with) this local copy for offline resilience and for
// migrating any pre-Month-4b local-only data up to the backend once. Kept
// keyed per Clerk user id so switching accounts on the same device doesn't
// leak one user's cached profile into another's.
function storageKey(userId: string): string {
  return `svel_profile_${userId}`;
}

export async function loadLocalProfile(userId: string): Promise<LocalProfileFields> {
  const stored = await readJSON<Partial<LocalProfileFields>>(storageKey(userId), {});
  return { ...DEFAULT_LOCAL_PROFILE, ...stored };
}

export async function saveLocalProfile(
  userId: string,
  fields: LocalProfileFields
): Promise<void> {
  await writeJSON(storageKey(userId), fields);
}
