import { Adventure } from "../types/adventure";

const DAY_MS = 86_400_000;

// Adventure.date is a local "YYYY-MM-DD" string (see utils/date.ts's
// formatDateISO). Parsing it with `new Date(dateStr)` treats it as UTC
// midnight, which can land on the wrong local calendar day depending on the
// device's timezone offset. Converting to a UTC-based day index instead
// keeps every date's *relative* spacing correct without ever needing to
// reason about local time - we only ever compare day differences, never an
// actual instant.
function dateStringToDayIndex(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

// A missed day or two doesn't end a dive trip - a week-long trip with a
// weather day or a planned surface interval in the middle is still one
// continuous stretch of being "in the water", not two separate ones. This
// is the gap (in days) tolerated between two logged days before a stretch
// is considered broken - e.g. logging Monday then Thursday (a 2-day gap)
// still counts as one continuous stretch; logging Monday then the
// following Monday (a 6-day gap) does not.
//
// Chosen instead of requiring literally-consecutive days: a strict
// day-over-day streak is a fitness-app/daily-habit concept that doesn't
// match how diving actually happens for the overwhelming majority of
// divers, who go on trips (with rest/travel days mixed in) rather than
// diving every single calendar day for weeks at a time. A strict version
// of this metric was previously the basis for the streak achievements
// (see utils/achievements.ts's STREAK_TIERS) and was all but unreachable
// for anyone who wasn't logging an adventure on literally every calendar
// day - "Weekly Rhythm" (7) and especially "Monthly Devotion" (30) were
// permanently locked for nearly everyone, which reads as broken/unfair
// rather than motivating.
const STRETCH_GRACE_DAYS = 2;

// The longest run of "active" days (see STRETCH_GRACE_DAYS above) that ever
// contained at least one logged adventure (any activity type - this is
// about staying consistently in the water, not about sticking to one
// activity). Deliberately the *longest ever* stretch, not the current one:
// every other achievement in this file is a permanent, monotonic unlock
// once a threshold is crossed, and one that could re-lock after a gap
// would break that pattern and feel punishing rather than motivating.
export function computeLongestActiveStretchDays(adventures: Adventure[]): number {
  const dayIndices = Array.from(new Set(adventures.map((a) => dateStringToDayIndex(a.date)))).sort(
    (a, b) => a - b
  );

  let longest = 0;
  let stretchStart: number | null = null;
  let previous: number | null = null;
  for (const day of dayIndices) {
    if (previous === null || day - previous > STRETCH_GRACE_DAYS + 1) {
      stretchStart = day;
    }
    longest = Math.max(longest, day - (stretchStart as number) + 1);
    previous = day;
  }
  return longest;
}

// The most recent logged adventure's date string ("YYYY-MM-DD") - lexical
// comparison is safe and sufficient since that format sorts chronologically
// without needing to parse it into a Date first.
export function getMostRecentAdventureDate(adventures: Adventure[]): string | null {
  if (adventures.length === 0) {
    return null;
  }
  return adventures.reduce((latest, a) => (a.date > latest ? a.date : latest), adventures[0].date);
}

// Whole calendar days between the most recent logged adventure and `now` -
// the actual signal a "haven't logged in a while" reminder should key off,
// as distinct from the longest-streak-ever achievement above. Returns null
// when there's no adventure to measure from (a brand new account shouldn't
// be told it's "overdue").
export function computeDaysSinceLastLog(adventures: Adventure[], now: Date = new Date()): number | null {
  if (adventures.length === 0) {
    return null;
  }
  const mostRecentDay = Math.max(...adventures.map((a) => dateStringToDayIndex(a.date)));
  const todayIndex = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
  return Math.max(0, todayIndex - mostRecentDay);
}
