import { Ionicons } from "@expo/vector-icons";

import { colors } from "./theme";
import { ActivityType } from "../types/adventure";

export interface ActivityTypeOption {
  value: ActivityType;
  label: string;
  /** Ionicons glyph used in form/UI contexts (log picker, analytics filter). */
  icon: keyof typeof Ionicons.glyphMap;
  /** Emoji used for map pins - a distinct silhouette per type (not just
   * color) so activity types stay distinguishable for colorblind users.
   * Kept separate from `icon` since map pins on web are raw Leaflet HTML,
   * which can't render an Ionicons font glyph the way native views can. */
  markerEmoji: string;
  /** Same color identity already used for this activity's achievement
   * badges (see utils/achievements.ts) - reused here, not redefined. */
  color: string;
}

// Single source of truth for every supported activity type - the log flow's
// picker (components/log/ActivityTypePicker.tsx), the profile analytics
// filter (components/profile/ActivityTypeFilter.tsx), and the map markers
// (components/map/CyanDivePin.tsx, DiveMapView.web.tsx) all read from this
// list, so adding a future type (fishing, boating, surfing) is a one-line
// change here rather than touching every consumer.
export const ACTIVITY_TYPES: ActivityTypeOption[] = [
  {
    value: "scuba",
    label: "Scuba Diving",
    icon: "trending-down-outline",
    markerEmoji: "🤿",
    color: colors.achievement.scuba,
  },
  {
    value: "snorkeling",
    label: "Snorkeling",
    icon: "water-outline",
    markerEmoji: "🐠",
    color: colors.achievement.snorkel,
  },
  {
    value: "freediving",
    label: "Freediving",
    icon: "body-outline",
    // 🫁 (lungs) - a distinct silhouette from scuba's 🤿 and snorkeling's 🐠,
    // and thematically fits freediving/apnea breath-holds.
    markerEmoji: "🫁",
    color: colors.achievement.freediving,
  },
];

export function getActivityTypeOption(value: ActivityType): ActivityTypeOption {
  // ACTIVITY_TYPES always has an entry for every ActivityType value - this
  // fallback only matters if that invariant is ever broken.
  return ACTIVITY_TYPES.find((option) => option.value === value) ?? ACTIVITY_TYPES[0];
}

// Every activity type today (scuba, snorkeling, freediving) is marine - this
// is trivially always true right now, but it's a named function rather than
// a hardcoded `true` at every call site so a future non-marine type (fishing
// in freshwater, for instance) only needs one line changed here. Drives
// which curated species vocabulary the species picker's nearby-suggestions
// feature matches GBIF results against (see utils/nearbySpecies.ts) -
// GBIF itself has no notion of "marine" (see gbif_species.py on the
// backend), so that decision lives entirely on this side.
export function isMarineActivity(_value: ActivityType): boolean {
  return true;
}
