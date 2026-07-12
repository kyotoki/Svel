import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";
import { Achievement } from "../../utils/achievements";

interface AchievementDetailModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export default function AchievementDetailModal({
  achievement,
  onClose,
}: AchievementDetailModalProps) {
  if (!achievement) {
    return null;
  }

  const { unlocked, color, emoji, name, description } = achievement;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View
            style={[
              styles.iconCircle,
              unlocked
                ? { backgroundColor: withOpacity(color, 0.12), borderColor: color, shadowColor: color }
                : styles.iconCircleLocked,
            ]}
          >
            <Text style={[styles.emoji, !unlocked && styles.emojiLocked]}>{emoji}</Text>
          </View>

          <Text style={styles.name}>{name}</Text>

          <View style={[styles.statusPill, unlocked ? styles.statusPillUnlocked : styles.statusPillLocked]}>
            <Ionicons
              name={unlocked ? "checkmark-circle-outline" : "lock-closed-outline"}
              size={13}
              color={unlocked ? colors.success : colors.text.secondary}
            />
            <Text style={[styles.statusText, unlocked ? styles.statusTextUnlocked : styles.statusTextLocked]}>
              {unlocked ? "Unlocked" : "Locked"}
            </Text>
          </View>

          <Text style={styles.description}>{description}</Text>

          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeButtonText}>Got it</Text>
          </Pressable>
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
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xxl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    // One-off glow shadow - color is dynamic (per achievement).
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: spacing.md,
  },
  iconCircleLocked: {
    backgroundColor: colors.surface.page,
    borderColor: colors.border.default,
  },
  emoji: {
    fontSize: typography.size.display,
  },
  emojiLocked: {
    opacity: 0.55,
  },
  name: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  statusPillUnlocked: {
    backgroundColor: colors.successTint,
  },
  statusPillLocked: {
    backgroundColor: colors.surface.page,
  },
  statusText: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
  },
  statusTextUnlocked: {
    color: colors.success,
  },
  statusTextLocked: {
    color: colors.text.secondary,
  },
  description: {
    fontSize: typography.size.body,
    color: colors.text.label,
    textAlign: "center",
    lineHeight: typography.lineHeight.body,
    marginBottom: spacing.lg,
  },
  closeButton: {
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  closeButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
});
