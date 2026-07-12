import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ACTIVITY_TYPES } from "../../constants/activityTypes";
import {
  FIELD_BORDER,
  FIELD_FILL,
  FIELD_PADDING_HORIZONTAL,
  FIELD_PADDING_VERTICAL,
  FIELD_RADIUS,
} from "../../constants/fieldStyle";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { ActivityType } from "../../types/adventure";

const OPTIONS = ACTIVITY_TYPES;

interface ActivityTypePickerProps {
  value: ActivityType;
  onChange: (value: ActivityType) => void;
}

export default function ActivityTypePicker({ value, onChange }: ActivityTypePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Activity Type</Text>
      <Pressable
        style={styles.field}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Activity type, ${selected.label}`}
      >
        <View style={styles.selectedIconBadge}>
          <Ionicons name={selected.icon} size={16} color={colors.primary} />
        </View>
        <Text style={styles.selectedText}>{selected.label}</Text>
        <Ionicons name="chevron-down-outline" size={18} color={colors.text.secondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e?.stopPropagation()}>
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
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: FIELD_FILL,
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    borderRadius: FIELD_RADIUS,
    paddingHorizontal: FIELD_PADDING_HORIZONTAL,
    paddingVertical: FIELD_PADDING_VERTICAL,
  },
  selectedIconBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedText: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
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
