// Design tokens - the single source of truth for color, type, spacing,
// radius, and elevation across the app. These values were consolidated from
// what was already in consistent use across screens/components (not invented
// from scratch), so refactoring a component to use them shouldn't change how
// it looks - only how many places you'd have to touch to change it later.

// ---------------------------------------------------------------------------
// Palette - raw values. Prefer the semantic exports below (colors, gradients)
// in components; reach for `palette` directly only when adding a new
// semantic token here.
// ---------------------------------------------------------------------------

const palette = {
  // Ocean blue - primary brand color (CTAs, links, active states, focus rings)
  blue900: "#0B3D91",
  blue600: "#1668C1",

  // Deep teal-navy - secondary brand color (dark hero surfaces, headers)
  teal900: "#0B3D5C",
  teal950: "#062C43",
  abyss: "#02101F", // darkest gradient stop - distinct from shadowInk below

  // Bright cyan - accent, used sparingly for glow/highlight/loading motion
  cyan500: "#06B6D4",

  // Gold - the "Pro" / premium accent. Deliberately kept separate from the
  // semantic colors below since it never represents a state (success/warning/
  // error) - it always means "premium feature".
  gold300: "#FFD873",
  gold700: "#8A6300",
  gold900: "#3E2E05",
  // A lighter, warmer cream-gold - not derivable from gold300 via opacity -
  // used for secondary text sitting directly on the premium gradient.
  goldCream: "#FFE8BD",

  // Semantic states
  green700: "#1B8A5A",
  greenTint: "#E6F4EC",
  amber700: "#B7791F",
  amberTint: "#FBF0DC",
  red700: "#B00020",
  redTint: "#FBE7EA",
  coral300: "#FF9A8A", // error text tuned for dark surfaces (auth screens)

  // Neutral text
  ink900: "#101828",
  ink700: "#344054",
  ink500: "#5A6B87",
  // ink400/300/200 are darkened from their original #94A3B8/#A0AEC0/#CBD5E1 -
  // those failed WCAG AA on white/pageBg (2.56:1 / 2.26:1 / 1.48:1, computed
  // via actual relative-luminance contrast math, not eyeballed). Kept in the
  // same relative order (ink400 darkest/most-emphasis -> ink200
  // lightest/least, matching text.tertiary > text.muted > text.disabled)
  // rather than converging all three on one AA-minimum shade. ink200 is only
  // used for genuinely disabled UI (WCAG's inactive-component text is exempt
  // from the contrast requirement), so it's improved but deliberately not
  // pushed all the way to 4.5:1 - that would stop reading as "disabled".
  ink400: "#6C7786", // 4.54:1 on white (text.tertiary)
  ink300: "#85909F", // 3.24:1 on white (text.muted - placeholder text only)
  ink200: "#9CA4AD", // 2.52:1 on white (text.disabled - inactive UI, exempt from AA)

  // Neutral surfaces & borders
  white: "#FFFFFF",
  pageBg: "#F2F6FC",
  tintBlue: "#EAF6FA",
  border: "#E2E8F0",
  borderStrong: "#D0D9E6",

  // Text/UI on dark ocean surfaces (auth, onboarding, gradient heroes)
  iceBlue: "#8FB8CE",
  iceBlueStrong: "#C7DCE8",
  iceBlueFaint: "#6E93A8", // placeholder/empty-state text on dark surfaces

  // Achievement badge accents - deliberately varied/colorful for visual
  // distinction between badge categories, unlike the rest of the app's
  // restrained palette. Some categories reuse the core brand/semantic colors
  // (scuba/snorkel/globetrotter below); these three don't have an existing
  // equivalent elsewhere.
  goldenrod600: "#B8860B",
  violet700: "#5B3E96",
  rust700: "#B0472B",
  teal700: "#0F766E",
  flame600: "#EA580C",

  // Marine life category accents (constants/marineLife.ts) - two of these
  // don't have an existing equivalent above (a shark-skin slate, a true
  // coral pink distinct from `coral300`, which is reserved for dark-surface
  // error text and would be a confusing double meaning to reuse here).
  slate600: "#475569",
  coralPink500: "#FF6F61",

  // Dedicated shadow ink - close to `abyss` but a distinct value used
  // consistently as shadowColor (and as the base for the dark overlay scrims
  // below), never as a surface or gradient stop.
  shadowInk: "#021019",
};

// ---------------------------------------------------------------------------
// Color - semantic tokens. Import this in components.
// ---------------------------------------------------------------------------

export const colors = {
  primary: palette.blue900,
  primaryLight: palette.blue600,
  secondary: palette.teal900,
  accent: palette.cyan500,

  success: palette.green700,
  successTint: palette.greenTint,
  warning: palette.amber700,
  warningTint: palette.amberTint,
  error: palette.red700,
  errorTint: palette.redTint,
  errorOnDark: palette.coral300,

  premium: palette.gold300,
  premiumText: palette.gold700,
  premiumTextStrong: palette.gold900,
  premiumTextOnDark: palette.goldCream,

  text: {
    primary: palette.ink900,
    label: palette.ink700,
    secondary: palette.ink500,
    tertiary: palette.ink400,
    muted: palette.ink300,
    disabled: palette.ink200,
    inverse: palette.white,
    inverseMuted: palette.iceBlue,
    inverseStrong: palette.iceBlueStrong,
    inverseFaint: palette.iceBlueFaint,
  },

  achievement: {
    scuba: palette.blue900,
    snorkel: palette.cyan500,
    freediving: palette.teal700,
    certification: palette.goldenrod600,
    globetrotter: palette.green700,
    nightOwl: palette.violet700,
    gearGuru: palette.rust700,
    streak: palette.flame600,
  },

  // One color per marine life species category (constants/marineLife.ts) -
  // reused as-is for that category's achievement badges (utils/achievements.ts),
  // the same "reused, not redefined" relationship activityTypes.ts already
  // has with achievement colors elsewhere in this file.
  marineLife: {
    fish: palette.cyan500,
    sharksRays: palette.slate600,
    marineMammals: palette.blue600,
    reptiles: palette.green700,
    cephalopods: palette.violet700,
    crustaceans: palette.rust700,
    mollusks: palette.goldenrod600,
    corals: palette.coralPink500,
    other: palette.ink500,
  },

  surface: {
    page: palette.pageBg,
    card: palette.white,
    tint: palette.tintBlue,
  },

  border: {
    default: palette.border,
    strong: palette.borderStrong,
  },

  overlay: {
    // Modal backdrop scrim - used identically across every modal.
    modalScrim: "rgba(4, 20, 35, 0.55)",
    scrimLight: "rgba(2, 16, 25, 0.28)",
    scrimMedium: "rgba(2, 16, 25, 0.4)",
    scrimStrong: "rgba(2, 16, 25, 0.68)",
  },

  shadowColor: palette.shadowInk,
};

// The recurring "deep ocean" hero gradient (auth screens, profile header) and
// the primary-brand gradient (stat highlight cards).
export const gradients = {
  deepOcean: [palette.abyss, palette.teal950, palette.teal900] as const,
  primary: [palette.blue900, palette.blue600] as const,
};

// For glassy/translucent fills on dark or photo surfaces, where the alpha
// varies by context but the underlying color shouldn't be re-guessed at each
// call site, e.g. withOpacity(colors.text.inverse, 0.14).
export function withOpacity(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Typography - 2 explicit weights (regular text relies on the platform
// default of 400) and a consistent size/line-height scale.
// ---------------------------------------------------------------------------

export const typography = {
  weight: {
    semibold: "600",
    bold: "700",
  } as const,
  size: {
    caption: 11, // uppercase eyebrow labels, tiny badges/pills
    small: 13, // helper text, meta text, secondary buttons
    body: 15, // default body copy
    subtitle: 17, // emphasized body, list-item titles
    title: 20, // section headers, modal titles
    headline: 24, // card headlines, stat numbers
    display: 32, // hero numbers, welcome-screen titles
  },
  lineHeight: {
    caption: 15,
    small: 18,
    body: 21,
    subtitle: 23,
    title: 26,
    headline: 30,
    display: 38,
  },
  tracking: {
    wide: 0.5, // uppercase eyebrow labels
  },
};

// ---------------------------------------------------------------------------
// Spacing - 4px base increments. Use these instead of arbitrary padding/
// margin/gap numbers.
// ---------------------------------------------------------------------------

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// ---------------------------------------------------------------------------
// Radius
// ---------------------------------------------------------------------------

export const radius = {
  sm: 8, // chips, tags, small buttons
  md: 12, // inputs, standard buttons
  lg: 16, // cards
  xl: 20, // large cards, sheets
  xxl: 24, // hero cards, prominent modals
  full: 999, // pill/circular shapes - use instead of computing height / 2
};

// ---------------------------------------------------------------------------
// Elevation - shadowColor is always colors.shadowColor; these four levels
// cover every shadow combination already in use across the app.
// ---------------------------------------------------------------------------

export const elevation = {
  card: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  floating: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  modal: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  // No fixed shadowColor - a focused input's glow is tied to whatever color
  // its focused border uses (usually colors.primary), not the fixed
  // shadowInk the other levels share. Spread this and add shadowColor at
  // the call site, e.g. { ...elevation.focus, shadowColor: colors.primary }.
  focus: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
};

export const theme = {
  colors,
  gradients,
  typography,
  spacing,
  radius,
  elevation,
  withOpacity,
};

export default theme;
