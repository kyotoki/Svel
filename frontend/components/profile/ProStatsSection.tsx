import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";
import { Adventure } from "../../types/adventure";
import { buildMonthDistribution, buildPersonalRecordsTimeline, buildYearOverYearStats } from "../../utils/proStats";
import { formatDepth, UnitSystem } from "../../utils/units";
import AccordionSection from "./AccordionSection";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BAR_MAX_HEIGHT = 64;
const RECORDS_SHOWN = 8;

interface ProStatsSectionProps {
  adventures: Adventure[];
  unitSystem: UnitSystem;
  isPro: boolean;
  onRequirePro: () => void;
}

// Deeper breakdowns than the free Adventure Analytics section: year-over-
// year trends, a timeline of when each personal record was actually set
// (not just what it is today), and a seasonal (by-month) distribution.
// Gated behind Pro - always visible in the profile so free users know it
// exists, but shows a locked teaser instead of real numbers until isPro is
// true (see utils/proTier.ts - hardcoded false today, no real purchases
// wired up yet).
export default function ProStatsSection({ adventures, unitSystem, isPro, onRequirePro }: ProStatsSectionProps) {
  if (!isPro) {
    return (
      <AccordionSection title="Advanced Stats" icon="trending-down-outline">
        <View style={styles.lockedWrap}>
          <View style={styles.lockedBadge}>
            <Ionicons name="star-outline" size={22} color={colors.premium} />
          </View>
          <Text style={styles.lockedTitle}>Year-over-year trends, personal record timeline & more</Text>
          <Text style={styles.lockedMessage}>
            See how your diving has changed over time, exactly when you hit each personal best, and which months
            you're actually in the water.
          </Text>
          <Pressable
            style={styles.unlockButton}
            onPress={onRequirePro}
            accessibilityRole="button"
            accessibilityLabel="Unlock with Svel Pro"
          >
            <Ionicons name="star-outline" size={14} color={colors.text.inverse} />
            <Text style={styles.unlockButtonText}>Unlock with Svel Pro</Text>
          </Pressable>
        </View>
      </AccordionSection>
    );
  }

  const years = buildYearOverYearStats(adventures);
  const records = buildPersonalRecordsTimeline(adventures).slice(0, RECORDS_SHOWN);
  const months = buildMonthDistribution(adventures);
  const maxMonthCount = Math.max(1, ...months.map((m) => m.count));

  return (
    <AccordionSection title="Advanced Stats" icon="trending-down-outline">
      <Text style={styles.subLabel}>YEAR OVER YEAR</Text>
      {years.map((year) => (
        <View key={year.year} style={styles.yearRow}>
          <Text style={styles.yearLabel}>{year.year}</Text>
          <View style={styles.yearStats}>
            <Text style={styles.yearStatText}>
              {year.totalTrips} adventure{year.totalTrips === 1 ? "" : "s"}
            </Text>
            <Text style={styles.yearStatText}>{(year.totalMinutes / 60).toFixed(1)} hrs</Text>
            <Text style={styles.yearStatText}>
              {year.deepestMeters != null ? formatDepth(year.deepestMeters, unitSystem) : "—"}
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>PERSONAL RECORD TIMELINE</Text>
      {records.length === 0 ? (
        <Text style={styles.emptyText}>No records yet - log an adventure to start one.</Text>
      ) : (
        records.map((record, index) => (
          <View key={`${record.metric}-${record.adventureId}`} style={styles.recordRow}>
            <Ionicons
              name={record.metric === "depth" ? "arrow-down-outline" : "time-outline"}
              size={15}
              color={colors.secondary}
            />
            <Text style={styles.recordText}>
              {record.metric === "depth"
                ? `New depth record: ${formatDepth(record.value, unitSystem)}`
                : `New duration record: ${record.value} min`}
            </Text>
            <Text style={styles.recordDate}>{record.date}</Text>
          </View>
        ))
      )}

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>ADVENTURES BY MONTH</Text>
      <View style={styles.barChart}>
        {months.map((bucket) => (
          <View key={bucket.month} style={styles.barColumn}>
            <View
              style={[
                styles.bar,
                { height: Math.max(2, (bucket.count / maxMonthCount) * BAR_MAX_HEIGHT) },
                bucket.count === 0 && styles.barEmpty,
              ]}
            />
            <Text style={styles.barLabel}>{MONTH_LABELS[bucket.month]}</Text>
          </View>
        ))}
      </View>
    </AccordionSection>
  );
}

const styles = StyleSheet.create({
  subLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  subLabelSpaced: {
    marginTop: spacing.lg,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.page,
  },
  yearLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  yearStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  yearStatText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  recordText: {
    flex: 1,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
  },
  recordDate: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: BAR_MAX_HEIGHT + 20,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  barEmpty: {
    backgroundColor: colors.border.default,
  },
  barLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  lockedWrap: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  lockedBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: withOpacity(colors.premium, 0.14),
    borderWidth: 1,
    borderColor: withOpacity(colors.premium, 0.4),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xxs,
  },
  lockedMessage: {
    fontSize: typography.size.small,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.lineHeight.small,
    maxWidth: 260,
    marginBottom: spacing.md,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.premium,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  unlockButtonText: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
});
