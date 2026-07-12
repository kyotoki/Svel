import { getActivityTypeOption } from "../constants/activityTypes";
import { SPECIES_CATEGORIES } from "../constants/marineLife";
import { colors } from "../constants/theme";
import { ActivityType, Adventure } from "../types/adventure";
import { buildLifeList, countDistinctSpeciesLogged } from "./lifeList";
import { GearItem } from "./profileStorage";
import { computeLongestActiveStretchDays } from "./streaks";

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  color: string;
  unlocked: boolean;
  description: string;
}

export interface AchievementGroups {
  streaks: Achievement[];
  scuba: Achievement[];
  snorkel: Achievement[];
  freediving: Achievement[];
  marineLife: Achievement[];
  certification: Achievement[];
  global: Achievement[];
}

const SCUBA_COLOR = colors.achievement.scuba;
const SNORKEL_COLOR = colors.achievement.snorkel;
const FREEDIVING_COLOR = colors.achievement.freediving;
const CERT_COLOR = colors.achievement.certification;
const GLOBETROTTER_COLOR = colors.achievement.globetrotter;
const NIGHT_OWL_COLOR = colors.achievement.nightOwl;
const GEAR_GURU_COLOR = colors.achievement.gearGuru;

function scubaEmoji(threshold: number): string {
  switch (threshold) {
    case 1:
      return "🤿";
    case 5:
      return "🌊";
    case 10:
      return "🔟";
    case 15:
      return "🏅";
    case 20:
      return "⭐";
    case 50:
      return "👑";
    case 100:
      return "🔱";
    default:
      return "🏆";
  }
}

// Fixed named tiers, then an escalator that keeps generating the next
// hundred-dive tier as the user's count approaches/passes it - the series
// never "runs out" no matter how many dives get logged.
function scubaMilestoneTiers(scubaCount: number): { threshold: number; name: string }[] {
  const tiers = [
    { threshold: 1, name: "First Descent" },
    { threshold: 5, name: "Deep Five" },
    { threshold: 10, name: "Double Digits" },
    { threshold: 15, name: "The Aqua 15" },
    { threshold: 20, name: "Vanguard 20" },
    { threshold: 50, name: "Half Century" },
    { threshold: 100, name: "Century Diver" },
  ];

  const nextUnearnedHundred = Math.max(200, Math.ceil((scubaCount + 1) / 100) * 100);
  for (let threshold = 200; threshold <= nextUnearnedHundred; threshold += 100) {
    tiers.push({ threshold, name: `${threshold} Dive Legend` });
  }
  return tiers;
}

const SNORKEL_TIERS: { threshold: number; name: string; emoji: string }[] = [
  { threshold: 1, name: "Reef Explorer", emoji: "🐠" },
  { threshold: 5, name: "Fin Fanatic", emoji: "🩱" },
  { threshold: 10, name: "Tidal Wave", emoji: "🌊" },
  { threshold: 15, name: "Mermaid Status", emoji: "🧜‍♀️" },
];

const FREEDIVING_TIERS: { threshold: number; name: string; emoji: string }[] = [
  { threshold: 1, name: "First Breath Hold", emoji: "🫁" },
  { threshold: 5, name: "Apnea Apprentice", emoji: "🐬" },
  { threshold: 10, name: "Deep Breath", emoji: "🌊" },
  { threshold: 15, name: "Freediving Adept", emoji: "🏅" },
];

const ELITE_CERTIFICATIONS = ["Rescue Diver", "Divemaster"];

const STREAK_TIERS: { threshold: number; name: string }[] = [
  { threshold: 7, name: "Weekly Rhythm" },
  { threshold: 30, name: "Monthly Devotion" },
];

// One depth/time milestone per activity type, not a full escalator ladder
// like the dive-count tiers above - a deliberately small, extensible seed
// set per the month's scope, not an exhaustive one. Thresholds picked to be
// meaningfully attainable per activity's own norms rather than one
// one-size-fits-all number (open-water recreational scuba depth limits sit
// around 18-30m; snorkeling is inherently a surface activity so a shallow
// duck-dive threshold fits; recreational freediving apnea depth commonly
// targets ~20m).
const DEPTH_MILESTONES: Record<ActivityType, { threshold: number; name: string }> = {
  scuba: { threshold: 30, name: "Deep Explorer" },
  snorkeling: { threshold: 5, name: "Below the Surface" },
  freediving: { threshold: 20, name: "Twenty Meter Club" },
};

const TIME_MILESTONES: Record<ActivityType, { thresholdMinutes: number; name: string }> = {
  scuba: { thresholdMinutes: 600, name: "10 Hours Underwater" },
  snorkeling: { thresholdMinutes: 300, name: "5 Hours in the Reef" },
  freediving: { thresholdMinutes: 180, name: "3 Hours of Breath Holds" },
};

// Longest-ever active stretch (not current), matching the permanent/monotonic
// unlock semantics every other achievement in this file already has - see
// computeLongestActiveStretchDays' own comment for why this tolerates gaps
// (a rest day or two on a dive trip) instead of requiring literally-back-to-
// back calendar days, which made these two tiers all but unreachable for
// anyone whose diving happens in trips rather than as a daily habit.
function buildStreakAchievements(adventures: Adventure[]): Achievement[] {
  const longestStretch = computeLongestActiveStretchDays(adventures);
  return STREAK_TIERS.map(({ threshold, name }) => {
    const unlocked = longestStretch >= threshold;
    return {
      id: `streak-${threshold}`,
      name,
      emoji: "🔥",
      color: colors.achievement.streak,
      unlocked,
      description: unlocked
        ? `Unlocked! You stayed active in the water across a ${threshold}+ day stretch.`
        : `Log adventures across a ${threshold}+ day stretch (any activity type, a rest day here and there is fine) to unlock ${name}.`,
    };
  });
}

// Icon/color sourced from activityTypes.ts (not redefined here) so map pins,
// the log picker, and these badges all agree on one identity per activity.
function buildDepthAchievement(activityType: ActivityType, adventures: Adventure[]): Achievement {
  const { threshold, name } = DEPTH_MILESTONES[activityType];
  const option = getActivityTypeOption(activityType);
  const deepest = adventures
    .filter((a) => a.activity_type === activityType)
    .reduce((max, a) => Math.max(max, a.max_depth_meters), 0);
  const unlocked = deepest >= threshold;
  return {
    id: `${activityType}-depth-${threshold}`,
    name,
    emoji: option.markerEmoji,
    color: option.color,
    unlocked,
    description: unlocked
      ? `Unlocked! Your deepest logged ${option.label} adventure reached ${deepest}m.`
      : `Locked: Log a ${option.label} adventure reaching ${threshold}m depth to unlock ${name}!`,
  };
}

function buildTimeAchievement(activityType: ActivityType, adventures: Adventure[]): Achievement {
  const { thresholdMinutes, name } = TIME_MILESTONES[activityType];
  const option = getActivityTypeOption(activityType);
  const totalMinutes = adventures
    .filter((a) => a.activity_type === activityType)
    .reduce((sum, a) => sum + a.duration_minutes, 0);
  const unlocked = totalMinutes >= thresholdMinutes;
  const thresholdHours = thresholdMinutes / 60;
  return {
    id: `${activityType}-time-${thresholdMinutes}`,
    name,
    // A generic clock rather than the activity's own marker emoji - within
    // the same per-activity scroll row as the depth achievement above, two
    // badges sharing one emoji would be harder to tell apart at a glance
    // even though color/label still differ.
    emoji: "⏱️",
    color: option.color,
    unlocked,
    description: unlocked
      ? `Unlocked! You've logged ${Math.floor(totalMinutes / 60)}+ hours of ${option.label}.`
      : `Locked: Log ${thresholdHours} total hours of ${option.label} to unlock ${name}!`,
  };
}

// A small, extensible seed set - matching DEPTH_MILESTONES/TIME_MILESTONES's
// "one meaningful tier per bucket, not a long escalator" philosophy, scaled
// to marine life's 9 categories (see constants/marineLife.ts, the shared
// source of truth this whole file reads from rather than redefining its own
// category list or colors).
const CATEGORY_SPECIALIST_THRESHOLD = 10;
const TOTAL_SPECIES_TIERS: { threshold: number; name: string }[] = [
  { threshold: 25, name: "Marine Naturalist" },
  { threshold: 50, name: "Marine Life Expert" },
];

function buildMarineLifeAchievements(adventures: Adventure[]): Achievement[] {
  const totalSpecies = countDistinctSpeciesLogged(adventures);
  const groups = buildLifeList(adventures);

  const achievements: Achievement[] = [
    {
      id: "marine-life-first-sighting",
      name: "First Sighting",
      emoji: "🔍",
      color: colors.primary,
      unlocked: totalSpecies >= 1,
      description:
        totalSpecies >= 1
          ? "Unlocked! You've logged your first marine life sighting."
          : "Locked: Tag a species while logging an adventure to unlock First Sighting!",
    },
  ];

  // One "first sighting in this category" achievement per category,
  // generated from SPECIES_CATEGORIES rather than hardcoded per-category -
  // adding a 10th category later extends this automatically.
  for (const categoryOption of SPECIES_CATEGORIES) {
    const group = groups.find((g) => g.category === categoryOption.value);
    const count = group?.entries.length ?? 0;
    const unlocked = count >= 1;
    achievements.push({
      id: `marine-life-first-${categoryOption.value}`,
      name: `First ${categoryOption.label}`,
      emoji: categoryOption.emoji,
      color: categoryOption.color,
      unlocked,
      description: unlocked
        ? `Unlocked! You've logged your first ${categoryOption.label.toLowerCase()} sighting.`
        : `Locked: Tag a species from ${categoryOption.label} to unlock First ${categoryOption.label}!`,
    });
  }

  const categorySpecialist = groups.some((g) => g.entries.length >= CATEGORY_SPECIALIST_THRESHOLD);
  achievements.push({
    id: "marine-life-category-specialist",
    name: "Category Specialist",
    emoji: "🔬",
    color: colors.primary,
    unlocked: categorySpecialist,
    description: categorySpecialist
      ? `Unlocked! You've logged ${CATEGORY_SPECIALIST_THRESHOLD}+ species in a single category.`
      : `Locked: Log ${CATEGORY_SPECIALIST_THRESHOLD} species within one category to unlock Category Specialist!`,
  });

  for (const { threshold, name } of TOTAL_SPECIES_TIERS) {
    const unlocked = totalSpecies >= threshold;
    const remaining = threshold - totalSpecies;
    achievements.push({
      id: `marine-life-total-${threshold}`,
      name,
      emoji: "🐠",
      color: colors.secondary,
      unlocked,
      description: unlocked
        ? `Unlocked! You've logged ${totalSpecies} distinct species.`
        : `Locked: Log ${remaining} more distinct ${pluralize(remaining, "species", "species")} to unlock ${name}!`,
    });
  }

  return achievements;
}

// Adventures don't capture a dive start time (the date picker is date-only),
// so "night" is read from created_at - when the entry was logged - as the
// closest available real signal, the same way stats.py's "countries_visited"
// is documented as a distinct-location-name proxy rather than a true
// geocoded country.
function isLoggedAtNight(adventure: Adventure): boolean {
  const hour = new Date(adventure.created_at).getHours();
  return hour >= 18 || hour < 6;
}

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function buildAchievements(
  adventures: Adventure[],
  gear: GearItem[],
  certifications: string[]
): AchievementGroups {
  const scubaCount = adventures.filter((a) => a.activity_type === "scuba").length;
  const snorkelCount = adventures.filter((a) => a.activity_type === "snorkeling").length;
  const freedivingCount = adventures.filter((a) => a.activity_type === "freediving").length;

  const scuba: Achievement[] = scubaMilestoneTiers(scubaCount).map(({ threshold, name }) => {
    const unlocked = scubaCount >= threshold;
    const remaining = threshold - scubaCount;
    return {
      id: `scuba-${threshold}`,
      name,
      emoji: scubaEmoji(threshold),
      color: SCUBA_COLOR,
      unlocked,
      description: unlocked
        ? `Unlocked! You've logged ${scubaCount} scuba ${pluralize(scubaCount, "dive")}.`
        : `Locked: Log ${remaining} more scuba ${pluralize(remaining, "dive")} to unlock ${name}!`,
    };
  });
  scuba.push(buildDepthAchievement("scuba", adventures), buildTimeAchievement("scuba", adventures));

  const snorkel: Achievement[] = SNORKEL_TIERS.map(({ threshold, name, emoji }) => {
    const unlocked = snorkelCount >= threshold;
    const remaining = threshold - snorkelCount;
    return {
      id: `snorkel-${threshold}`,
      name,
      emoji,
      color: SNORKEL_COLOR,
      unlocked,
      description: unlocked
        ? `Unlocked! You've logged ${snorkelCount} snorkeling ${pluralize(snorkelCount, "adventure")}.`
        : `Locked: Log ${remaining} more snorkeling ${pluralize(remaining, "adventure")} to unlock ${name}!`,
    };
  });
  snorkel.push(
    buildDepthAchievement("snorkeling", adventures),
    buildTimeAchievement("snorkeling", adventures)
  );

  const freediving: Achievement[] = FREEDIVING_TIERS.map(({ threshold, name, emoji }) => {
    const unlocked = freedivingCount >= threshold;
    const remaining = threshold - freedivingCount;
    return {
      id: `freediving-${threshold}`,
      name,
      emoji,
      color: FREEDIVING_COLOR,
      unlocked,
      description: unlocked
        ? `Unlocked! You've logged ${freedivingCount} freediving ${pluralize(freedivingCount, "session")}.`
        : `Locked: Log ${remaining} more freediving ${pluralize(remaining, "session")} to unlock ${name}!`,
    };
  });
  freediving.push(
    buildDepthAchievement("freediving", adventures),
    buildTimeAchievement("freediving", adventures)
  );

  const streaks: Achievement[] = buildStreakAchievements(adventures);
  const marineLife: Achievement[] = buildMarineLifeAchievements(adventures);

  const hasCertification = certifications.length > 0;
  const hasEliteCertification = certifications.some((c) => ELITE_CERTIFICATIONS.includes(c));
  const certification: Achievement[] = [
    {
      id: "cert-explorer",
      name: "Certified Explorer",
      emoji: "🎓",
      color: CERT_COLOR,
      unlocked: hasCertification,
      description: hasCertification
        ? "Unlocked! You've logged a real-world diving certification."
        : "Locked: Check off any certification in My Certifications & Licenses to unlock Certified Explorer!",
    },
    {
      id: "cert-elite",
      name: "Elite Guardian",
      emoji: "🛡️",
      color: CERT_COLOR,
      unlocked: hasEliteCertification,
      description: hasEliteCertification
        ? "Unlocked! Rescue Diver (or higher) confirmed."
        : "Locked: Add Rescue Diver or Divemaster in My Certifications & Licenses to unlock Elite Guardian!",
    },
  ];

  // No geocoded country is stored on an adventure (only a free-text
  // location_name) - distinct location names is the same practical proxy
  // the backend's DiveStats.countries_visited already uses.
  const distinctLocations = new Set(
    adventures.map((a) => a.location_name.trim().toLowerCase()).filter(Boolean)
  ).size;
  const hasGlobetrotter = distinctLocations >= 2;
  const locationsRemaining = Math.max(2 - distinctLocations, 0);

  const hasNightOwl = adventures.some(isLoggedAtNight);

  const hasGearGuru = gear.length >= 3;
  const gearRemaining = Math.max(3 - gear.length, 0);

  const global: Achievement[] = [
    {
      id: "global-trotter",
      name: "Globetrotter",
      emoji: "🌍",
      color: GLOBETROTTER_COLOR,
      unlocked: hasGlobetrotter,
      description: hasGlobetrotter
        ? "Unlocked! You've logged adventures across multiple locations."
        : `Locked: Log adventures in ${locationsRemaining} more distinct ${pluralize(locationsRemaining, "location")} to unlock Globetrotter!`,
    },
    {
      id: "global-nightowl",
      name: "Night Owl",
      emoji: "🌙",
      color: NIGHT_OWL_COLOR,
      unlocked: hasNightOwl,
      description: hasNightOwl
        ? "Unlocked! You've logged an adventure between 6 PM and 6 AM."
        : "Locked: Log an adventure between 6 PM and 6 AM to unlock Night Owl!",
    },
    {
      id: "global-gearguru",
      name: "Gear Guru",
      emoji: "🔧",
      color: GEAR_GURU_COLOR,
      unlocked: hasGearGuru,
      description: hasGearGuru
        ? "Unlocked! You're tracking 3+ pieces of gear in the Gear Manager."
        : `Locked: Add ${gearRemaining} more gear ${pluralize(gearRemaining, "item")} in the Gear Manager to unlock Gear Guru!`,
    },
  ];

  return { streaks, scuba, snorkel, freediving, marineLife, certification, global };
}
