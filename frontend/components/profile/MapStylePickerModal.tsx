import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";
import { MapStyle } from "../../contexts/PreferencesContext";

const OPTIONS: { value: MapStyle; label: string; icon: keyof typeof Ionicons.glyphMap; proOnly: boolean }[] = [
  { value: "standard", label: "Standard", icon: "map-outline", proOnly: false },
  { value: "satellite", label: "Satellite", icon: "planet-outline", proOnly: true },
  { value: "hybrid", label: "Hybrid", icon: "layers-outline", proOnly: true },
];

interface MapStylePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: MapStyle;
  onSelect: (value: MapStyle) => void;
  isPro: boolean;
  onRequirePro: () => void;
}

export default function MapStylePickerModal({
  visible,
  onClose,
  value,
  onSelect,
  isPro,
  onRequirePro,
}: MapStylePickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.menu} onPress={(e) => e?.stopPropagation()}>
          <Text style={styles.title}>Map Style</Text>
          {OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const isLocked = option.proOnly && !isPro;
            return (
              <Pressable
                key={option.value}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  if (isLocked) {
                    onClose();
                    onRequirePro();
                    return;
                  }
                  onSelect(option.value);
                  onClose();
                }}
                accessibilityRole="radio"
                accessibilityLabel={isLocked ? `${option.label}, Svel Pro required` : option.label}
                accessibilityState={{ selected: isSelected, disabled: isLocked }}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={isSelected ? colors.text.inverse : isLocked ? colors.text.tertiary : colors.primary}
                />
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    isLocked && styles.optionTextLocked,
                  ]}
                >
                  {option.label}
                </Text>
                {isLocked && (
                  <View style={styles.proBadge}>
                    <Ionicons name="lock-closed-outline" size={10} color={colors.premiumTextStrong} />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
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
  );
}

const styles = StyleSheet.create({
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
  title: {
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
  optionTextLocked: {
    color: colors.text.tertiary,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: withOpacity(colors.premium, 0.16),
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.premiumTextStrong,
    letterSpacing: 0.4,
  },
  checkmark: {
    marginLeft: spacing.xs,
  },
});
