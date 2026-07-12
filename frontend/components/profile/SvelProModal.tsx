import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, gradients, radius, spacing, typography, withOpacity } from "../../constants/theme";

interface SvelProModalProps {
  visible: boolean;
  onClose: () => void;
}

// The core logging loop (any activity type, species tagging/life list, the
// standard map, achievements/stats, nearby-species suggestions) is
// deliberately not listed here at all - this screen only ever lists what
// Pro *adds*, never implies any of this is behind a paywall. See the
// free/Pro audit this list came out of: nothing in the app actually gates
// any of these today, and it should stay that way.
const FREE_FEATURES = [
  "Adventure logging - every activity type",
  "Species tagging & life list",
  "Standard map view",
  "Achievements & stats",
  "Nearby species suggestions",
];

const PRO_FEATURES = [
  "Satellite & Hybrid map imagery",
  "Unlimited photo storage (free is capped at 6 per adventure)",
  "Advanced stats: year-over-year trends, personal record timeline, seasonal breakdowns",
];

type Plan = "annual" | "monthly";

const PLAN_COPY: Record<Plan, { price: string; period: string; note?: string }> = {
  annual: { price: "$44.99", period: "/year", note: "Just $3.75/mo - save 46% vs. monthly" },
  monthly: { price: "$6.99", period: "/month" },
};

export default function SvelProModal({ visible, onClose }: SvelProModalProps) {
  // Annual is the default/highlighted plan, not monthly - a single
  // infrequent annual charge is easier to live with than a recurring
  // monthly one, and defaulting to it (rather than presenting both
  // equally) is the actual lever for that, not just listing it as an option.
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");

  return (
    // Deliberately "slide", not "fade" like every other modal in this app -
    // every other modal (see components/profile/*Modal.tsx,
    // components/map/AdventureDetailModal.tsx) is `transparent`, a small
    // backdrop-anchored dialog, where a fade is the right feel. This one is
    // opaque and full-screen (its own SafeAreaView, its own scroll content) -
    // a genuinely different UI shape, a page-sheet, not a dialog - and
    // "slide up from bottom" is the conventional transition for that shape
    // on both platforms. Keep this distinction; don't "fix" it into fade.
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <LinearGradient colors={gradients.deepOcean} style={styles.hero}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close-outline" size={22} color={colors.text.inverse} />
          </Pressable>
          <View style={styles.heroIconBadge}>
            <Ionicons name="star-outline" size={28} color={colors.premium} />
          </View>
          <Text style={styles.heroTitle}>Svel Pro</Text>
          <Text style={styles.heroTagline}>Unlock the full ocean experience</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.planRow}>
            <PlanOption
              plan="annual"
              selected={selectedPlan === "annual"}
              onSelect={() => setSelectedPlan("annual")}
              badge="BEST VALUE"
            />
            <PlanOption
              plan="monthly"
              selected={selectedPlan === "monthly"}
              onSelect={() => setSelectedPlan("monthly")}
            />
          </View>

          <View style={styles.tierCard}>
            <Text style={styles.tierLabel}>FREE VERSION</Text>
            {FREE_FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.text.tertiary} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <LinearGradient
            colors={[colors.secondary, colors.premiumTextStrong, colors.premiumText]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tierCardPro}
          >
            <View style={styles.proTierHeader}>
              <Ionicons name="star-outline" size={16} color={colors.premium} />
              <Text style={styles.tierLabelPro}>SVEL PRO ADDS</Text>
            </View>
            {PRO_FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.premium} />
                <Text style={styles.featureTextPro}>{feature}</Text>
              </View>
            ))}
          </LinearGradient>
        </ScrollView>

        <View style={styles.ctaWrap}>
          <Pressable style={styles.ctaButton} disabled accessibilityState={{ disabled: true }}>
            <Ionicons name="lock-closed-outline" size={16} color={withOpacity(colors.text.inverse, 0.7)} />
            <Text style={styles.ctaButtonText}>
              {`Upgrade to Pro — ${PLAN_COPY[selectedPlan].price}${PLAN_COPY[selectedPlan].period} — Coming Soon`}
            </Text>
          </Pressable>
          <Text style={styles.ctaNote}>Premium subscriptions aren't available yet.</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function PlanOption({
  plan,
  selected,
  onSelect,
  badge,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  const copy = PLAN_COPY[plan];
  return (
    <Pressable
      style={[styles.planCard, selected && styles.planCardSelected]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan === "annual" ? "Annual" : "Monthly"} plan, ${copy.price}${copy.period}`}
    >
      {badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[styles.planName, selected && styles.planNameSelected]}>
        {plan === "annual" ? "Annual" : "Monthly"}
      </Text>
      <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
        {copy.price}
        <Text style={styles.planPeriod}>{copy.period}</Text>
      </Text>
      {copy.note && <Text style={[styles.planNote, selected && styles.planNoteSelected]}>{copy.note}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.page,
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  closeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: withOpacity(colors.surface.card, 0.14),
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: withOpacity(colors.premium, 0.16),
    borderWidth: 1,
    borderColor: withOpacity(colors.premium, 0.4),
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  heroTagline: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverseStrong,
    marginTop: spacing.xxs,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  planRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  planCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    padding: spacing.md,
    alignItems: "center",
  },
  planCardSelected: {
    borderColor: colors.premium,
    backgroundColor: withOpacity(colors.premium, 0.08),
  },
  planBadge: {
    position: "absolute",
    top: -10,
    backgroundColor: colors.premium,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.premiumTextStrong,
    letterSpacing: 0.4,
  },
  planName: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  planNameSelected: {
    color: colors.text.primary,
  },
  planPrice: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  planPriceSelected: {
    color: colors.text.primary,
  },
  planPeriod: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  planNote: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
    textAlign: "center",
  },
  planNoteSelected: {
    color: colors.secondary,
    fontWeight: typography.weight.semibold,
  },
  tierCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    // One-off card shadow (opacity/elevation don't match the standard "card"
    // preset) - only the color is shared with the rest of the app.
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  tierCardPro: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    // One-off glow shadow tied to the premium gold color.
    shadowColor: colors.premiumText,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  proTierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  tierLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
  },
  tierLabelPro: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.premium,
    letterSpacing: 0.8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
  },
  featureTextPro: {
    flex: 1,
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  ctaWrap: {
    padding: spacing.md,
    paddingTop: spacing.xs,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.text.secondary,
    opacity: 0.6,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  ctaButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    textAlign: "center",
  },
  ctaNote: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
});
