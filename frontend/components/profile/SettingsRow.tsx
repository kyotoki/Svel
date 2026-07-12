import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";
import AnimatedPressable from "../ui/AnimatedPressable";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtext?: string;
  onPress?: () => void;
  highlighted?: boolean;
  /** Tints the icon and label with colors.error - for actions like Log Out
   * or Delete Account, without the full filled background `highlighted`
   * uses (which reads as "promoted", not "destructive"). */
  destructive?: boolean;
  /** Replaces the trailing chevron with custom content (e.g. an inline toggle). */
  rightElement?: ReactNode;
}

export default function SettingsRow({
  icon,
  label,
  subtext,
  onPress,
  highlighted = false,
  destructive = false,
  rightElement,
}: SettingsRowProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.row, highlighted && styles.rowHighlighted]}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      pressedScale={0.98}
    >
      <View style={[styles.iconBadge, highlighted && styles.iconBadgeHighlighted, destructive && styles.iconBadgeDestructive]}>
        <Ionicons
          name={icon}
          size={17}
          color={highlighted ? colors.text.inverse : destructive ? colors.error : colors.secondary}
        />
      </View>
      <View style={styles.textWrap}>
        <Text
          style={[styles.label, highlighted && styles.labelHighlighted, destructive && styles.labelDestructive]}
        >
          {label}
        </Text>
        {subtext ? (
          <Text style={[styles.subtext, highlighted && styles.subtextHighlighted]}>
            {subtext}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (
        onPress ? (
          <Ionicons
            name="chevron-forward-outline"
            size={18}
            color={highlighted ? withOpacity(colors.text.inverse, 0.8) : colors.text.tertiary}
          />
        ) : null
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowHighlighted: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.xxs,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeHighlighted: {
    backgroundColor: withOpacity(colors.surface.card, 0.18),
  },
  iconBadgeDestructive: {
    backgroundColor: withOpacity(colors.error, 0.12),
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  labelHighlighted: {
    color: colors.text.inverse,
  },
  labelDestructive: {
    color: colors.error,
  },
  subtext: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  subtextHighlighted: {
    color: withOpacity(colors.text.inverse, 0.75),
  },
});
