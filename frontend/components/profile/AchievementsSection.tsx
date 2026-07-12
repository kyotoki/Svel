import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";
import { Achievement, AchievementGroups } from "../../utils/achievements";
import { CERTIFICATIONS } from "../../utils/certifications";
import AccordionSection from "./AccordionSection";
import AchievementBadge from "./AchievementBadge";
import SettingsRow from "./SettingsRow";

interface AchievementsSectionProps {
  achievements: AchievementGroups;
  certificationsLoggedCount: number;
  onSelectAchievement: (achievement: Achievement) => void;
  onOpenCertifications: () => void;
}

export default function AchievementsSection({
  achievements,
  certificationsLoggedCount,
  onSelectAchievement,
  onOpenCertifications,
}: AchievementsSectionProps) {
  return (
    <AccordionSection title="Achievement Milestone Matrix" icon="trophy-outline" defaultExpanded>
      <Text style={styles.subLabel}>STREAKS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollRow}
      >
        {achievements.streaks.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </ScrollView>

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>SCUBA MILESTONES</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollRow}
      >
        {achievements.scuba.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </ScrollView>

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>SNORKEL MILESTONES</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollRow}
      >
        {achievements.snorkel.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </ScrollView>

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>FREEDIVING MILESTONES</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollRow}
      >
        {achievements.freediving.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </ScrollView>

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>MARINE LIFE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollRow}
      >
        {achievements.marineLife.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </ScrollView>

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>CERTIFICATIONS</Text>
      <View style={styles.achievementRow}>
        {achievements.certification.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </View>
      <SettingsRow
        icon="ribbon-outline"
        label="My Certifications & Licenses"
        subtext={
          certificationsLoggedCount > 0
            ? `${certificationsLoggedCount} of ${CERTIFICATIONS.length} logged`
            : "Log your real-world diving credentials"
        }
        onPress={onOpenCertifications}
      />

      <Text style={[styles.subLabel, styles.subLabelSpaced]}>GLOBAL & ADVENTURE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollRow}
      >
        {achievements.global.map((achievement, index) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onSelectAchievement}
            index={index}
          />
        ))}
      </ScrollView>
    </AccordionSection>
  );
}

const styles = StyleSheet.create({
  subLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  subLabelSpaced: {
    marginTop: spacing.lg,
  },
  achievementScrollRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.xxs,
  },
  achievementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingBottom: spacing.xxs,
  },
});
