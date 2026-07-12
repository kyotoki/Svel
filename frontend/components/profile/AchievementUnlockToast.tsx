import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, elevation, radius, spacing, typography, withOpacity } from "../../constants/theme";
import { Achievement } from "../../utils/achievements";

const VISIBLE_MS = 2600;
const ENTER_MS = 240;
const EXIT_MS = 200;

interface AchievementUnlockToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

// A small top-anchored banner, not a full-screen takeover - the "small,
// tasteful, quick" reward this app's achievement/streak system (Month 3)
// was missing. Slides down and fades in on unlock, holds briefly, then
// slides back up and fades out - the same restrained motion language as
// everything else in this pass (a crisp timing curve, not a bounce/spring,
// so it doesn't read as more "game-like" than the rest of the app on the
// 50th time someone earns something).
export default function AchievementUnlockToast({ achievement, onDismiss }: AchievementUnlockToastProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!achievement) {
      return;
    }

    progress.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });

    const dismissTimer = setTimeout(() => {
      progress.value = withTiming(
        0,
        { duration: EXIT_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        }
      );
    }, VISIBLE_MS);

    return () => clearTimeout(dismissTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievement?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -24 }],
  }));

  if (!achievement) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]} pointerEvents="none">
      <Animated.View
        style={[styles.toast, animatedStyle]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: withOpacity(achievement.color, 0.15), borderColor: achievement.color },
          ]}
        >
          <Text style={styles.emoji}>{achievement.emoji}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.eyebrow}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={styles.name} numberOfLines={1}>
            {achievement.name}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    maxWidth: 320,
    ...elevation.floating,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: {
    fontSize: typography.size.subtitle,
  },
  textWrap: {
    flexShrink: 1,
  },
  eyebrow: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: typography.tracking.wide,
  },
  name: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
});
