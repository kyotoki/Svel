import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getSpeciesCategoryOption } from "../../constants/marineLife";
import { colors, spacing, typography } from "../../constants/theme";
import { Adventure } from "../../types/adventure";
import { buildLifeList, countDistinctSpeciesLogged } from "../../utils/lifeList";
import EmptyState from "../ui/EmptyState";
import SpeciesChip from "../ui/SpeciesChip";
import AccordionSection from "./AccordionSection";

interface LifeListSectionProps {
  adventures: Adventure[];
  onLogAdventure: () => void;
}

// A personal checklist/collection mechanic (a birder's "life list") - every
// species this user has ever tagged while logging an adventure, grouped by
// category, with a running count. Deliberately shows only species actually
// logged (not the full ~264-species catalog with a "not yet seen" state for
// everything else) - the appeal is watching your own list grow, not being
// confronted with a long list of blanks.
export default function LifeListSection({ adventures, onLogAdventure }: LifeListSectionProps) {
  const groups = useMemo(() => buildLifeList(adventures), [adventures]);
  const totalSpecies = useMemo(() => countDistinctSpeciesLogged(adventures), [adventures]);

  return (
    <AccordionSection title="Marine Life List" icon="fish-outline">
      {totalSpecies === 0 ? (
        <EmptyState
          size="compact"
          icon={{ emoji: "🐠" }}
          title="Your life list is empty"
          message="Tag species you spot next time you log an adventure to start your collection."
          action={{ label: "Log Adventure", onPress: onLogAdventure }}
        />
      ) : (
        <>
          <Text style={styles.summary}>
            {totalSpecies} {totalSpecies === 1 ? "species" : "species"} logged across {groups.length}{" "}
            {groups.length === 1 ? "category" : "categories"}
          </Text>

          {groups.map((group) => {
            const categoryOption = getSpeciesCategoryOption(group.category);
            return (
              <View key={group.category} style={styles.categoryBlock}>
                <View style={styles.categoryHeaderRow}>
                  <Ionicons name={categoryOption.icon} size={14} color={colors.secondary} />
                  <Text style={styles.categoryHeaderText}>
                    {categoryOption.label} ({group.entries.length})
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {group.entries.map((entry) => (
                    <SpeciesChip
                      key={entry.species.id}
                      emoji={entry.species.emoji}
                      label={entry.species.commonName}
                      count={entry.sightingCount}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}
    </AccordionSection>
  );
}

const styles = StyleSheet.create({
  summary: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  categoryBlock: {
    marginBottom: spacing.md,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryHeaderText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: typography.tracking.wide,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
