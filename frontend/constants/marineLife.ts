import { Ionicons } from "@expo/vector-icons";

import { colors } from "./theme";

export type SpeciesCategory =
  | "fish"
  | "sharks_rays"
  | "marine_mammals"
  | "reptiles"
  | "cephalopods"
  | "crustaceans"
  | "mollusks"
  | "corals"
  | "other";

export interface SpeciesCategoryOption {
  value: SpeciesCategory;
  label: string;
  /** Ionicons glyph used in category headers/filters (life list sections,
   * species picker group headers) - same role activityTypes.ts's `icon`
   * plays for activity types. Necessarily abstract/thematic rather than
   * literal: Ionicons has no shark/turtle/crab/coral glyphs to draw on. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Fallback glyph for any species in this category that isn't distinct
   * enough to warrant its own emoji. Unicode has very few marine-specific
   * glyphs, so most species in a large category intentionally share one of
   * these rather than going without - the same pragmatic call already made
   * for activityTypes.ts's map pins and achievement badge tiers, where
   * the name label carries the actual distinction, not the glyph alone. */
  emoji: string;
  /** This category's identity color - used for its life list header and its
   * "first sighting in this category" achievement badge
   * (utils/achievements.ts). Reused from constants/theme.ts's
   * colors.marineLife, not redefined here - the same relationship
   * activityTypes.ts already has with colors.achievement. */
  color: string;
}

// Single source of truth for every species category - the log flow's
// species picker, the profile life list, achievement milestones, and the
// map's per-pin species view all read from this file (and SPECIES below),
// so adding a future category or species is a one-line change here rather
// than touching every consumer. Mirrors constants/activityTypes.ts's shape
// and role deliberately.
export const SPECIES_CATEGORIES: SpeciesCategoryOption[] = [
  { value: "fish", label: "Fish", icon: "fish-outline", emoji: "🐠", color: colors.marineLife.fish },
  {
    value: "sharks_rays",
    label: "Sharks & Rays",
    icon: "triangle-outline",
    emoji: "🦈",
    color: colors.marineLife.sharksRays,
  },
  {
    value: "marine_mammals",
    label: "Marine Mammals",
    icon: "water-outline",
    emoji: "🐬",
    color: colors.marineLife.marineMammals,
  },
  {
    value: "reptiles",
    label: "Reptiles",
    icon: "shield-outline",
    emoji: "🐢",
    color: colors.marineLife.reptiles,
  },
  {
    value: "cephalopods",
    label: "Cephalopods",
    icon: "color-palette-outline",
    emoji: "🐙",
    color: colors.marineLife.cephalopods,
  },
  {
    value: "crustaceans",
    label: "Crustaceans",
    icon: "diamond-outline",
    emoji: "🦀",
    color: colors.marineLife.crustaceans,
  },
  {
    value: "mollusks",
    label: "Mollusks",
    icon: "ellipse-outline",
    emoji: "🐚",
    color: colors.marineLife.mollusks,
  },
  { value: "corals", label: "Corals", icon: "flower-outline", emoji: "🪸", color: colors.marineLife.corals },
  { value: "other", label: "Other", icon: "apps-outline", emoji: "🌊", color: colors.marineLife.other },
];

export function getSpeciesCategoryOption(category: SpeciesCategory): SpeciesCategoryOption {
  // SPECIES_CATEGORIES always has an entry for every SpeciesCategory value -
  // this fallback only matters if that invariant is ever broken.
  return SPECIES_CATEGORIES.find((option) => option.value === category) ?? SPECIES_CATEGORIES[0];
}

export interface Species {
  id: string;
  commonName: string;
  category: SpeciesCategory;
  emoji: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

// A tuple's second element overrides the category's default emoji for that
// one species (e.g. a shark's own 🦈 vs. a ray sharing the category's 🐠
// fallback); omitting it just uses the category default.
type SpeciesSeed = [commonName: string, emojiOverride?: string];

function buildCategory(category: SpeciesCategory, seeds: SpeciesSeed[]): Species[] {
  const categoryDefault = getSpeciesCategoryOption(category).emoji;
  return seeds.map(([commonName, emojiOverride]) => ({
    id: `${category}-${slugify(commonName)}`,
    commonName,
    category,
    emoji: emojiOverride ?? categoryDefault,
  }));
}

// Curated starting set covering species commonly sighted across the world's
// major dive/snorkel/freedive regions (Red Sea, Coral Triangle, Caribbean,
// Galápagos/Eastern Pacific, South Pacific, Hawaii, temperate California/
// South Australia/South Africa, and polar sites) - not an exhaustive marine
// biology database. Extend freely; every consumer (picker, life list,
// achievements, map) reads from SPECIES below with no further wiring.
const FISH: SpeciesSeed[] = [
  ["Clownfish"],
  ["Parrotfish"],
  ["Angelfish"],
  ["Butterflyfish"],
  ["Triggerfish"],
  ["Moray Eel", "🐟"],
  ["Grouper", "🐟"],
  ["Snapper", "🐟"],
  ["Barracuda", "🐟"],
  ["Lionfish"],
  ["Wrasse"],
  ["Surgeonfish (Tang)"],
  ["Pufferfish", "🐡"],
  ["Boxfish", "🐟"],
  ["Batfish", "🐟"],
  ["Seahorse"],
  ["Tuna", "🐟"],
  ["Sardine", "🐟"],
  ["Emperor Angelfish"],
  ["Regal Angelfish"],
  ["Blue Tang"],
  ["Powder Blue Tang"],
  ["Longnose Butterflyfish"],
  ["Raccoon Butterflyfish"],
  ["Clown Triggerfish"],
  ["Titan Triggerfish"],
  ["Picasso Triggerfish"],
  ["Giant Moray", "🐟"],
  ["Ribbon Eel", "🐟"],
  ["Garden Eel", "🐟"],
  ["Snowflake Eel", "🐟"],
  ["Peacock Grouper", "🐟"],
  ["Potato Cod", "🐟"],
  ["Yellowtail Snapper", "🐟"],
  ["Twinspot Lionfish"],
  ["Cleaner Wrasse"],
  ["Bird Wrasse"],
  ["Harlequin Tuskfish"],
  ["Yellow Tang"],
  ["Achilles Tang"],
  ["Sohal Surgeonfish"],
  ["Longhorn Cowfish", "🐟"],
  ["Spotted Boxfish", "🐟"],
  ["Pinnate Batfish", "🐟"],
  ["Longnose Hawkfish"],
  ["Tomato Clownfish"],
  ["Skunk Clownfish"],
  ["Fusilier", "🐟"],
  ["Rainbow Runner", "🐟"],
  ["Bigeye Trevally", "🐟"],
  ["Bluefin Trevally", "🐟"],
  ["Foxface Rabbitfish"],
  ["Pyramid Butterflyfish"],
  ["Oriental Sweetlips"],
  ["Sailfish", "🐟"],
  ["Wahoo", "🐟"],
  ["Leaf Scorpionfish", "🐟"],
  ["Painted Frogfish", "🐟"],
  ["Giant Sea Bass", "🐟"],
  ["Sarcastic Fringehead", "🐟"],
  ["Sheephead", "🐟"],
];

const SHARKS_RAYS: SpeciesSeed[] = [
  ["Whale Shark"],
  ["Blacktip Reef Shark"],
  ["Whitetip Reef Shark"],
  ["Grey Reef Shark"],
  ["Nurse Shark"],
  ["Hammerhead Shark"],
  ["Great Hammerhead"],
  ["Scalloped Hammerhead"],
  ["Bull Shark"],
  ["Tiger Shark"],
  ["Lemon Shark"],
  ["Manta Ray", "🐠"],
  ["Eagle Ray", "🐠"],
  ["Stingray", "🐠"],
  ["Electric Ray", "🐠"],
  ["Guitarfish", "🐠"],
  ["Great White Shark"],
  ["Oceanic Whitetip Shark"],
  ["Silvertip Shark"],
  ["Galápagos Shark"],
  ["Silky Shark"],
  ["Zebra Shark"],
  ["Wobbegong Shark"],
  ["Epaulette Shark"],
  ["Thresher Shark"],
  ["Blue Shark"],
  ["Mako Shark"],
  ["Port Jackson Shark"],
  ["Angel Shark"],
  ["Spotted Eagle Ray", "🐠"],
  ["Southern Stingray", "🐠"],
  ["Cownose Ray", "🐠"],
  ["Devil Ray (Mobula)", "🐠"],
  ["Sawfish", "🐠"],
  ["Basking Shark"],
  ["Sand Tiger Shark"],
  ["Caribbean Reef Shark"],
  ["Blacktip Shark"],
  ["Spinner Shark"],
  ["Leopard Shark"],
  ["Swell Shark"],
  ["Horn Shark"],
  ["Sixgill Shark"],
  ["Bowmouth Guitarfish", "🐠"],
  ["Blue-spotted Ribbontail Ray", "🐠"],
  ["Round Ribbontail Ray", "🐠"],
  ["Marbled Ray", "🐠"],
  ["Bat Ray", "🐠"],
  ["Butterfly Ray", "🐠"],
  ["Pelagic Stingray", "🐠"],
];

const MARINE_MAMMALS: SpeciesSeed[] = [
  ["Bottlenose Dolphin"],
  ["Spinner Dolphin"],
  ["Humpback Whale", "🐋"],
  ["Orca", "🐋"],
  ["Manatee", "🦭"],
  ["Dugong", "🦭"],
  ["Harbor Seal", "🦭"],
  ["Sea Lion", "🦭"],
  ["Sea Otter", "🦦"],
  ["Galápagos Sea Lion", "🦭"],
  ["Galápagos Fur Seal", "🦭"],
  ["Weddell Seal", "🦭"],
  ["Leopard Seal", "🦭"],
  ["Minke Whale", "🐋"],
  ["Sperm Whale", "🐋"],
  ["Pilot Whale", "🐋"],
  ["Beluga Whale", "🐋"],
  ["Common Dolphin"],
  ["Risso's Dolphin"],
  ["Dusky Dolphin"],
  ["Blue Whale", "🐋"],
  ["Fin Whale", "🐋"],
  ["Bryde's Whale", "🐋"],
  ["False Killer Whale", "🐋"],
  ["Melon-headed Whale", "🐋"],
  ["Striped Dolphin"],
  ["Atlantic Spotted Dolphin"],
  ["Hector's Dolphin"],
  ["Commerson's Dolphin"],
  ["Crabeater Seal", "🦭"],
  ["Ross Seal", "🦭"],
  ["Northern Elephant Seal", "🦭"],
  ["Steller Sea Lion", "🦭"],
];

const REPTILES: SpeciesSeed[] = [
  ["Green Sea Turtle"],
  ["Hawksbill Turtle"],
  ["Loggerhead Turtle"],
  ["Leatherback Turtle"],
  ["Olive Ridley Turtle"],
  ["Sea Snake", "🐍"],
  ["Banded Sea Krait", "🐍"],
  ["Marine Iguana", "🦎"],
  ["Saltwater Crocodile", "🐊"],
  ["Yellow-bellied Sea Snake", "🐍"],
];

const CEPHALOPODS: SpeciesSeed[] = [
  ["Day Octopus"],
  ["Common Cuttlefish"],
  ["Reef Squid", "🦑"],
  ["Blue-ringed Octopus"],
  ["Chambered Nautilus", "🐚"],
  ["Flamboyant Cuttlefish"],
  ["Mimic Octopus"],
  ["Coconut Octopus"],
  ["Broadclub Cuttlefish"],
  ["Caribbean Reef Squid", "🦑"],
  ["Giant Pacific Octopus"],
  ["Wunderpus Octopus"],
  ["Humboldt Squid", "🦑"],
  ["Bigfin Reef Squid", "🦑"],
  ["Pygmy Cuttlefish"],
];

const CRUSTACEANS: SpeciesSeed[] = [
  ["Cleaner Shrimp", "🦐"],
  ["Mantis Shrimp", "🦐"],
  ["Spiny Lobster", "🦞"],
  ["Hermit Crab"],
  ["Coconut Crab"],
  ["Ghost Crab"],
  ["Fiddler Crab"],
  ["Porcelain Crab"],
  ["Harlequin Shrimp", "🦐"],
  ["Boxer Shrimp", "🦐"],
  ["Pistol Shrimp", "🦐"],
  ["Decorator Crab"],
  ["Arrow Crab"],
  ["Sally Lightfoot Crab"],
  ["King Crab"],
  ["Emperor Shrimp", "🦐"],
  ["Banded Coral Shrimp", "🦐"],
  ["Squat Lobster", "🦞"],
  ["Slipper Lobster", "🦞"],
  ["Blue Crab"],
  ["Xeno Crab"],
  ["Anemone Crab"],
  ["Zebra Crab"],
  ["Acorn Barnacle"],
  ["Gooseneck Barnacle"],
];

const MOLLUSKS: SpeciesSeed[] = [
  ["Nudibranch", "🐌"],
  ["Giant Clam"],
  ["Cowrie"],
  ["Sea Hare", "🐌"],
  ["Queen Conch"],
  ["Flamingo Tongue Snail"],
  ["Spanish Dancer", "🐌"],
  ["Blue Dragon Nudibranch", "🐌"],
  ["Chiton"],
  ["Scallop"],
  ["Abalone"],
  ["Pyjama Nudibranch", "🐌"],
  ["Spanish Shawl Nudibranch", "🐌"],
  ["Tiger Cowrie"],
  ["Triton's Trumpet"],
  ["Giant Keyhole Limpet"],
  ["Lettuce Sea Slug", "🐌"],
  ["Tulip Snail"],
];

const CORALS: SpeciesSeed[] = [
  ["Brain Coral"],
  ["Staghorn Coral"],
  ["Elkhorn Coral"],
  ["Table Coral"],
  ["Soft Coral (Sea Fan)"],
  ["Fire Coral"],
  ["Mushroom Coral"],
  ["Pillar Coral"],
  ["Sea Whip (Gorgonian)"],
  ["Black Coral"],
  ["Bubble Coral"],
  ["Star Coral"],
  ["Lettuce Coral"],
  ["Cauliflower Coral"],
  ["Cabbage Coral"],
  ["Finger Coral"],
  ["Plate Coral"],
  ["Whip Coral"],
  ["Organ Pipe Coral"],
  ["Leather Coral"],
  ["Zoanthid"],
];

const OTHER: SpeciesSeed[] = [
  ["Sea Star", "⭐"],
  ["Crown-of-Thorns Starfish", "⭐"],
  ["Sea Urchin", "🦔"],
  ["Sea Cucumber", "🥒"],
  ["Feather Star", "🌸"],
  ["Moon Jellyfish", "🪼"],
  ["Sea Anemone", "🌸"],
  ["Barrel Sponge", "🧽"],
  ["Christmas Tree Worm", "🎄"],
  ["Cushion Star", "⭐"],
  ["Basket Star", "⭐"],
  ["Sea Pen", "🌸"],
  ["Blue Button", "🪼"],
  ["Portuguese Man o' War", "🪼"],
  ["Comb Jelly", "🪼"],
  ["Tunicate (Sea Squirt)", "🧽"],
  ["Sea Apple", "🥒"],
  ["Warty Sea Cucumber", "🥒"],
  ["Flower Urchin", "🦔"],
  ["Pencil Urchin", "🦔"],
  ["Brittle Star", "⭐"],
  ["Sea Lily", "🌸"],
  ["Lion's Mane Jellyfish", "🪼"],
  ["Box Jellyfish", "🪼"],
  ["Upside-down Jellyfish", "🪼"],
  ["Pyrosome", "🪼"],
  ["Feather Duster Worm", "🪱"],
  ["Bristle Worm", "🪱"],
  ["Persian Carpet Flatworm", "🪱"],
  ["Bobbit Worm", "🪱"],
  ["Salp", "🪼"],
];

export const SPECIES: Species[] = [
  ...buildCategory("fish", FISH),
  ...buildCategory("sharks_rays", SHARKS_RAYS),
  ...buildCategory("marine_mammals", MARINE_MAMMALS),
  ...buildCategory("reptiles", REPTILES),
  ...buildCategory("cephalopods", CEPHALOPODS),
  ...buildCategory("crustaceans", CRUSTACEANS),
  ...buildCategory("mollusks", MOLLUSKS),
  ...buildCategory("corals", CORALS),
  ...buildCategory("other", OTHER),
];

export function getSpeciesById(id: string): Species | undefined {
  return SPECIES.find((species) => species.id === id);
}

export function getSpeciesByCategory(category: SpeciesCategory): Species[] {
  return SPECIES.filter((species) => species.category === category);
}
