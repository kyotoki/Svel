import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";

interface SvelProRowProps {
  onPress: () => void;
}

export default function SvelProRow({ onPress }: SvelProRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.wrap} accessibilityRole="button">
      <LinearGradient
        colors={[colors.secondary, colors.premiumTextStrong, colors.premiumText]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconBadge}>
          <Ionicons name="star-outline" size={17} color={colors.premium} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>Svel Pro Membership</Text>
          <Text style={styles.subtext}>Unlock the full ocean experience</Text>
        </View>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginVertical: spacing.xxs,
    // One-off glow shadow tied to the premium gold color - doesn't match any
    // standard elevation preset.
    shadowColor: colors.premiumText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: withOpacity(colors.premium, 0.18),
    borderWidth: 1,
    borderColor: withOpacity(colors.premium, 0.4),
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },
  subtext: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: withOpacity(colors.premiumTextOnDark, 0.85),
    marginTop: spacing.xxs,
  },
  proBadge: {
    backgroundColor: colors.premium,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  proBadgeText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.premiumTextStrong,
    letterSpacing: 0.6,
  },
});
