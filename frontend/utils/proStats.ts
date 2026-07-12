import { Adventure } from "../types/adventure";

export interface YearlyStats {
  year: number;
  totalTrips: number;
  totalMinutes: number;
  deepestMeters: number | null;
}

// Most recent year first - this is a "how am I trending" view, so the
// current/most-recent year is what someone actually opens this to check.
export function buildYearOverYearStats(adventures: Adventure[]): YearlyStats[] {
  const byYear = new Map<number, YearlyStats>();
  for (const adventure of adventures) {
    const year = Number(adventure.date.slice(0, 4));
    const existing = byYear.get(year) ?? { year, totalTrips: 0, totalMinutes: 0, deepestMeters: null };
    existing.totalTrips += 1;
    existing.totalMinutes += adventure.duration_minutes;
    existing.deepestMeters =
      existing.deepestMeters == null
        ? adventure.max_depth_meters
        : Math.max(existing.deepestMeters, adventure.max_depth_meters);
    byYear.set(year, existing);
  }
  return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
}

export type RecordMetric = "depth" | "duration";

export interface PersonalRecord {
  metric: RecordMetric;
  value: number;
  date: string;
  adventureId: number;
  adventureTitle: string;
}

// Every time a new personal best was set, in the order it happened - not
// just today's current best. Answers "when did I hit each of my records",
// not just "what's my record now" (which the free Adventure Analytics
// section already shows via deepest_meters).
export function buildPersonalRecordsTimeline(adventures: Adventure[]): PersonalRecord[] {
  const chronological = [...adventures].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const records: PersonalRecord[] = [];
  let maxDepth = -Infinity;
  let maxDuration = -Infinity;

  for (const adventure of chronological) {
    if (adventure.max_depth_meters > maxDepth) {
      maxDepth = adventure.max_depth_meters;
      records.push({
        metric: "depth",
        value: adventure.max_depth_meters,
        date: adventure.date,
        adventureId: adventure.id,
        adventureTitle: adventure.title,
      });
    }
    if (adventure.duration_minutes > maxDuration) {
      maxDuration = adventure.duration_minutes;
      records.push({
        metric: "duration",
        value: adventure.duration_minutes,
        date: adventure.date,
        adventureId: adventure.id,
        adventureTitle: adventure.title,
      });
    }
  }

  return records.reverse(); // most recent record first
}

export interface MonthCount {
  /** 0-11 (January = 0), matching JS Date's own month indexing. */
  month: number;
  count: number;
}

// Adventures grouped by calendar month across every year logged (not
// per-year) - a "what season do I actually dive in" shape, the one
// distribution most divers would actually find useful to see at a glance.
export function buildMonthDistribution(adventures: Adventure[]): MonthCount[] {
  const counts = new Array(12).fill(0);
  for (const adventure of adventures) {
    const month = Number(adventure.date.slice(5, 7)) - 1;
    if (month >= 0 && month < 12) {
      counts[month] += 1;
    }
  }
  return counts.map((count, month) => ({ month, count }));
}
