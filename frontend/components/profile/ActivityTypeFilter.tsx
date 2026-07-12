import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";

import { ACTIVITY_TYPES } from "../../constants/activityTypes";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { ActivityFilter } from "../../types/adventure";

export type { ActivityFilter };

interface FilterOption {
  value: ActivityFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ALL_OPTION: FilterOption = {
  value: "all",
  label: "All Activities",
  icon: "apps-outline",
};

// "All Activities" is analytics-specific (logging a dive always needs one
// concrete type), so it's layered on top of the shared ACTIVITY_TYPES list
// rather than baked into it.
const OPTIONS: FilterOption[] = [ALL_OPTION, ...ACTIVITY_TYPES];

interface ActivityTypeFilterProps {
  value: ActivityFilter;
  onChange: (value: ActivityFilter) => void;
}

export default function ActivityTypeFilter({ value, onChange }: ActivityTypeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = OPTIONS.find((option) => option.value === value) ?? ALL_OPTION;

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setIsOpen(true)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Filter analytics by activity type"
      >
        <Ionicons name={selected.icon} size={14} color={colors.secondary} />
        <Text style={styles.triggerText}>{selected.label}</Text>
        <Ionicons name="chevron-down-outline" size={14} color={colors.text.secondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e?.stopPropagation()}>
            <Text style={styles.menuTitle}>FILTER BY ACTIVITY</Text>
            {OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={isSelected ? colors.text.inverse : colors.primary}
                  />
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-outline"
                      size={18}
                      color={colors.text.inverse}
                      style={styles.checkmark}
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.surface.tint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  triggerText: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.secondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.modalScrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  menu: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xs,
  },
  menuTitle: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  optionTextSelected: {
    color: colors.text.inverse,
  },
  checkmark: {
    marginLeft: spacing.xs,
  },
});
