import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import AnimatedPressable from "./AnimatedPressable";

// Either a single emoji glyph (the "brand moment" look used for whole-screen
// empty states, matching the map pins/welcome-screen convention) or an
// Ionicons name (the more restrained icon language already used inside
// AccordionSection headers/cards) - kept as a discriminated union rather
// than one untyped string so call sites can't accidentally pass an Ionicons
// name where an emoji was expected or vice versa.
export type EmptyStateIcon = { emoji: string } | { name: keyof typeof Ionicons.glyphMap };

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: EmptyStateIcon;
  title: string;
  message: string;
  action?: EmptyStateAction;
  /** "full" fills a whole screen/tab (e.g. the Map tab with zero adventures);
   * "compact" is sized to sit inside a card or AccordionSection alongside
   * other content (e.g. an empty stats grid or photo strip). */
  size?: "full" | "compact";
}

export default function EmptyState({ icon, title, message, action, size = "full" }: EmptyStateProps) {
  const isCompact = size === "compact";

  return (
    <View style={[styles.container, isCompact ? styles.containerCompact : styles.containerFull]}>
      <View style={[styles.badge, isCompact ? styles.badgeCompact : styles.badgeFull]}>
        {"emoji" in icon ? (
          <Text style={isCompact ? styles.emojiCompact : styles.emojiFull}>{icon.emoji}</Text>
        ) : (
          <Ionicons name={icon.name} size={isCompact ? 26 : 38} color={colors.primary} />
        )}
      </View>

      <Text style={isCompact ? styles.titleCompact : styles.titleFull}>{title}</Text>
      <Text style={isCompact ? styles.messageCompact : styles.messageFull}>{message}</Text>

      {action && (
        <AnimatedPressable
          style={[styles.button, isCompact && styles.buttonCompact]}
          onPress={action.onPress}
          hitSlop={spacing.xs}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Ionicons name="add-circle-outline" size={isCompact ? 16 : 18} color={colors.text.inverse} />
          <Text style={[styles.buttonText, isCompact && styles.buttonTextCompact]}>{action.label}</Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  containerFull: {
    flex: 1,
    padding: spacing.xxl,
  },
  containerCompact: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  badge: {
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  // Circle diameters are one-off component dimensions (like AchievementBadge's
  // 58px icon circle or StatCard's 34/44px icon badges elsewhere in this
  // design system) rather than something the 4px spacing scale covers.
  badgeFull: {
    width: 84,
    height: 84,
  },
  badgeCompact: {
    width: 56,
    height: 56,
    marginBottom: spacing.md,
  },
  emojiFull: {
    fontSize: 38,
  },
  emojiCompact: {
    fontSize: 24,
  },
  titleFull: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  titleCompact: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  messageFull: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: typography.lineHeight.body,
    maxWidth: 280,
  },
  messageCompact: {
    fontSize: typography.size.small,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.small,
    maxWidth: 240,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonCompact: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  buttonTextCompact: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
});
