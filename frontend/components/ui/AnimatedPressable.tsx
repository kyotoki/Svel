import { ReactNode } from "react";
import { GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewProps, ViewStyle } from "react-native";
import Animated, {
  AnimateProps,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press-in/press-out durations are deliberately short and asymmetric (quick
// down, slightly slower settle back up) rather than a spring/bounce - a
// bounce reads as playful the first few times and gimmicky by the 50th tap.
// A crisp scale is the shared tap-feedback language for every primary
// interactive element in the app (see components/ui/AnimatedPressable usage
// across SettingsRow, AccordionSection, AchievementBadge, EmptyState, etc.)
// rather than each one inventing its own feedback.
const PRESS_IN_MS = 90;
const PRESS_OUT_MS = 140;
const EASE_OUT = Easing.out(Easing.quad);

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. Defaults to a subtle, barely-there 0.96 -
   * enough to register as tactile feedback without calling attention to
   * itself on repeated daily use. */
  pressedScale?: number;
  /** Optional mount-in animation (e.g. FadeIn().delay(N)) - passed straight
   * through to the underlying Reanimated component. See AchievementBadge
   * for the one place this is used today (a subtle staggered entrance for a
   * freshly-expanded achievement grid). */
  entering?: AnimateProps<ViewProps>["entering"];
}

export default function AnimatedPressable({
  children,
  style,
  pressedScale = 0.96,
  onPressIn,
  onPressOut,
  entering,
  ...pressableProps
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withTiming(pressedScale, { duration: PRESS_IN_MS, easing: EASE_OUT });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: PRESS_OUT_MS, easing: EASE_OUT });
    onPressOut?.(event);
  };

  return (
    <ReanimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      entering={entering}
      {...pressableProps}
    >
      {children}
    </ReanimatedPressable>
  );
}
