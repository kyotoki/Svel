import { readJSON, writeJSON } from "./deviceStorage";

function storageKey(userId: string): string {
  return `svel_seen_achievements_${userId}`;
}

// `null` specifically means "never persisted for this user on this device
// before" (fresh install, or the first time this feature runs for an
// existing account) - distinct from an empty array, which means a baseline
// was already established and the account genuinely has zero unlocked
// achievements right now. The distinction matters: on a true first-ever
// load, whatever's already unlocked should be adopted as the baseline
// silently (no celebration flood for progress earned before this feature
// existed), but an empty array should still let the next real unlock
// trigger a celebration normally.
export async function getSeenAchievementIds(userId: string): Promise<string[] | null> {
  return readJSON<string[] | null>(storageKey(userId), null);
}

export async function saveSeenAchievementIds(userId: string, ids: string[]): Promise<void> {
  await writeJSON(storageKey(userId), ids);
}
