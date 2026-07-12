import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { colors, elevation, radius, spacing, typography } from "../../constants/theme";
import AnimatedPressable from "../ui/AnimatedPressable";

interface AccordionSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultExpanded?: boolean;
  /** Mounts children only after the first expand, instead of always-mounted-but-hidden.
   * Needed for expensive children (e.g. a map) that shouldn't be created while collapsed. */
  lazy?: boolean;
  /** Fires on every expand/collapse. Only called in uncontrolled mode (see
   * `expanded` below) - a controlling parent already knows its own state. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Provide together with `onToggle` to make this a controlled accordion -
   * e.g. a parent that force-expands sections matching an active search
   * query. Omit both to keep the section managing its own open/closed state. */
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}

export default function AccordionSection({
  title,
  icon,
  defaultExpanded = false,
  lazy = false,
  onExpandedChange,
  expanded: expandedProp,
  onToggle,
  children,
}: AccordionSectionProps) {
  const isControlled = expandedProp !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = isControlled ? expandedProp : internalExpanded;
  const [everExpanded, setEverExpanded] = useState(expanded);
  const [contentHeight, setContentHeight] = useState(0);
  const animatedProgress = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  // Keyed on the effective `expanded` value (whichever mode produced it) so
  // both a local tap and a controlling parent flipping its own state animate
  // the same way.
  useEffect(() => {
    if (expanded) {
      setEverExpanded(true);
    }
    Animated.timing(animatedProgress, {
      toValue: expanded ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const toggle = () => {
    if (isControlled) {
      onToggle?.();
      return;
    }
    const next = !internalExpanded;
    setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const onContentLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0 && measured !== contentHeight) {
      setContentHeight(measured);
    }
  };

  const animatedHeight = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });
  const rotate = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.card}>
      <AnimatedPressable
        onPress={toggle}
        style={styles.header}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        pressedScale={0.99}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name={icon} size={16} color={colors.secondary} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down-outline" size={18} color={colors.text.secondary} />
        </Animated.View>
      </AnimatedPressable>

      <Animated.View style={{ height: animatedHeight, overflow: "hidden" }}>
        <View onLayout={onContentLayout} style={styles.contentMeasure}>
          {lazy && !everExpanded ? null : children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...elevation.card,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  contentMeasure: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
