import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";

interface SpeciesChipProps {
  emoji: string;
  label: string;
  /** Sighting count - shown as a small badge only when > 1 (a single
   * sighting doesn't need a "1" badge cluttering the chip). */
  count?: number;
}

// The one shared "tagged species" pill - used by both the profile life list
// (components/profile/LifeListSection.tsx) and the map's per-pin species
// view (components/map/AdventureDetailModal.tsx), so the two "here's a
// species you've logged" moments in the app look identical rather than each
// inventing its own chip style.
export default function SpeciesChip({ emoji, label, count }: SpeciesChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined && count > 1 && (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.surface.tint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: "100%",
  },
  emoji: {
    fontSize: typography.size.small,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
    flexShrink: 1,
  },
  count: {
    backgroundColor: withOpacity(colors.primary, 0.14),
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxs,
  },
  countText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
});
