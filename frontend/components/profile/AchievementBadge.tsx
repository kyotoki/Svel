import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { FadeIn } from "react-native-reanimated";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";
import { Achievement } from "../../utils/achievements";
import AnimatedPressable from "../ui/AnimatedPressable";

// Reanimated's `entering` animations only ever play once, on a component's
// first mount - combined with AccordionSection's `lazy` mount (achievement
// rows don't exist in the tree until the section is first expanded), this
// means the stagger below plays once per expand, not on every re-render or
// scroll. Capped and short on purpose: a long achievement row shouldn't take
// visibly long to finish appearing on the 50th time someone opens this.
const STAGGER_STEP_MS = 25;
const MAX_STAGGER_MS = 200;
const ENTRANCE_DURATION_MS = 220;

interface AchievementBadgeProps {
  achievement: Achievement;
  onPress: (achievement: Achievement) => void;
  /** Position within its row/grid - used only to compute a small, capped
   * stagger delay for the entrance animation. Omit for a badge that isn't
   * part of a freshly-mounted list (e.g. rendered singly). */
  index?: number;
}

export default function AchievementBadge({ achievement, onPress, index = 0 }: AchievementBadgeProps) {
  const { unlocked, color, emoji, name } = achievement;
  const staggerDelay = Math.min(index * STAGGER_STEP_MS, MAX_STAGGER_MS);

  return (
    <AnimatedPressable
      style={styles.tile}
      onPress={() => onPress(achievement)}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${unlocked ? "unlocked" : "locked"}`}
      entering={FadeIn.duration(ENTRANCE_DURATION_MS).delay(staggerDelay)}
    >
      <View
        style={[
          styles.iconCircle,
          unlocked
            ? {
                backgroundColor: withOpacity(color, 0.12),
                borderColor: color,
                shadowColor: color,
              }
            : styles.iconCircleLocked,
        ]}
      >
        <Text style={[styles.emoji, !unlocked && styles.emojiLocked]}>{emoji}</Text>
        <View style={[styles.statusDot, unlocked ? styles.statusDotUnlocked : styles.statusDotLocked]}>
          <Ionicons name={unlocked ? "checkmark-outline" : "lock-closed-outline"} size={9} color={colors.text.inverse} />
        </View>
      </View>
      <Text style={[styles.name, !unlocked && styles.nameLocked]} numberOfLines={2}>
        {name}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 82,
    alignItems: "center",
    gap: spacing.xs,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    // One-off glow shadow - color is dynamic (per achievement), so only the
    // shape (offset/opacity/radius/elevation) would be shared with a token,
    // and no existing elevation preset matches this specific combination.
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 5,
  },
  iconCircleLocked: {
    backgroundColor: colors.surface.page,
    borderColor: colors.border.default,
    opacity: 0.6,
  },
  emoji: {
    fontSize: typography.size.headline,
  },
  emojiLocked: {
    opacity: 0.5,
  },
  statusDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface.card,
  },
  statusDotUnlocked: {
    backgroundColor: colors.success,
  },
  statusDotLocked: {
    backgroundColor: colors.text.tertiary,
  },
  name: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.label,
    textAlign: "center",
  },
  nameLocked: {
    color: colors.text.tertiary,
  },
});
