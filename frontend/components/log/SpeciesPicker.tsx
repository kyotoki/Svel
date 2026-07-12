import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { isMarineActivity } from "../../constants/activityTypes";
import {
  FIELD_BORDER,
  FIELD_FILL,
  FIELD_PADDING_HORIZONTAL,
  FIELD_PADDING_VERTICAL,
  FIELD_RADIUS,
} from "../../constants/fieldStyle";
import { getSpeciesCategoryOption, Species, SPECIES, SPECIES_CATEGORIES, SpeciesCategory } from "../../constants/marineLife";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { ActivityType } from "../../types/adventure";
import { useAuthedFetch } from "../../utils/api";
import { fetchNearbySpecies } from "../../utils/nearbySpecies";
import AccordionSection from "../profile/AccordionSection";

interface SpeciesPickerProps {
  selectedIds: string[];
  onToggle: (speciesId: string) => void;
  /** The adventure's coordinates, once entered - null while the location
   * fields are still empty/invalid. Powers "Suggested Near You"; the picker
   * works exactly the same without them, just without that section. */
  latitude: number | null;
  longitude: number | null;
  activityType: ActivityType;
}

interface CategoryGroup {
  category: SpeciesCategory;
  species: Species[];
}

type NearbyStatus = "idle" | "loading" | "loaded";

// A grouped, searchable picker rather than free text, so entries stay
// consistent enough to aggregate later (life list, achievements, map's
// per-pin species view - see constants/marineLife.ts). Each category is its
// own collapsed-by-default dropdown (not one long flat list of ~264 rows) -
// browsing a single category at a time is far less overwhelming than
// scrolling past every fish to find a turtle. A "Suggested Near You" section
// (species GBIF has occurrence records for close to this adventure's
// coordinates - see utils/nearbySpecies.ts) sits above the category
// browser when available, so the picker leads with what's actually likely
// to be here instead of an alphabetical wall of everything.
export default function SpeciesPicker({
  selectedIds,
  onToggle,
  latitude,
  longitude,
  activityType,
}: SpeciesPickerProps) {
  const authedFetch = useAuthedFetch();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<SpeciesCategory>>(new Set());
  const [nearbyStatus, setNearbyStatus] = useState<NearbyStatus>("idle");
  const [nearbySpecies, setNearbySpecies] = useState<Species[]>([]);

  const hasCoordinates = latitude != null && longitude != null;

  // Fires each time the picker opens (not on every keystroke elsewhere in
  // the form) - the location fields are answered before this picker in the
  // log flow, so by the time this fires latitude/longitude are usually
  // already filled in. Failures resolve to an empty list, not an error
  // state - see fetchNearbySpecies.
  useEffect(() => {
    if (!isOpen || !hasCoordinates) {
      return;
    }
    let cancelled = false;
    setNearbyStatus("loading");
    fetchNearbySpecies(authedFetch, latitude as number, longitude as number, isMarineActivity(activityType)).then(
      (nearby) => {
        if (!cancelled) {
          setNearbySpecies(nearby);
          setNearbyStatus("loaded");
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, latitude, longitude, activityType]);

  // Checked against both the curated list and this session's fetched nearby
  // results (which may include ad-hoc, non-curated species - see
  // utils/nearbySpecies.ts) - any id a user could have selected in this
  // picker instance came from one of those two pools.
  const selectedSpecies = useMemo(() => {
    const pool = [...SPECIES, ...nearbySpecies];
    return selectedIds.map((id) => pool.find((species) => species.id === id)).filter((s): s is Species => !!s);
  }, [selectedIds, nearbySpecies]);

  const isSearching = query.trim().length > 0;
  const showNearbySection = !isSearching && (nearbyStatus === "loading" || nearbySpecies.length > 0);

  const groups = useMemo<CategoryGroup[]>(() => {
    const trimmed = query.trim().toLowerCase();
    const matches = trimmed ? SPECIES.filter((s) => s.commonName.toLowerCase().includes(trimmed)) : SPECIES;

    const result: CategoryGroup[] = [];
    for (const categoryOption of SPECIES_CATEGORIES) {
      const inCategory = matches.filter((s) => s.category === categoryOption.value);
      if (inCategory.length === 0) {
        continue;
      }
      result.push({ category: categoryOption.value, species: inCategory });
    }
    return result;
  }, [query]);

  const toggleCategory = (category: SpeciesCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.field}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selectedSpecies.length === 0
            ? "Species spotted, none tagged"
            : `Species spotted, ${selectedSpecies.length} tagged`
        }
      >
        {selectedSpecies.length === 0 ? (
          <Text style={styles.placeholder}>Tag species you saw...</Text>
        ) : (
          <Text style={styles.selectedText} numberOfLines={1}>
            {selectedSpecies.map((s) => s.emoji).join(" ")}
            {"  "}
            {selectedSpecies.length} species tagged
          </Text>
        )}
        <Ionicons name="chevron-down-outline" size={18} color={colors.text.secondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e?.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Species Spotted</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Done">
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.search}
              placeholder="Search species..."
              placeholderTextColor={colors.text.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />

            {groups.length === 0 ? (
              <Text style={styles.emptyText}>No species match &quot;{query}&quot;.</Text>
            ) : (
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {showNearbySection && (
                  <View style={styles.nearbySection}>
                    <View style={styles.nearbySectionHeader}>
                      <Ionicons name="navigate-outline" size={14} color={colors.secondary} />
                      <Text style={styles.nearbySectionTitle}>
                        Suggested Near You{nearbySpecies.length > 0 ? ` (${nearbySpecies.length})` : ""}
                      </Text>
                      {nearbyStatus === "loading" && <ActivityIndicator size="small" color={colors.secondary} />}
                    </View>
                    {nearbySpecies.map((species) => (
                      <SpeciesRow
                        key={species.id}
                        species={species}
                        checked={selectedIds.includes(species.id)}
                        onToggle={onToggle}
                      />
                    ))}
                  </View>
                )}

                {groups.map((group) => (
                  <CategoryDropdown
                    key={group.category}
                    group={group}
                    // While searching, every matching category is forced open
                    // so results are visible without also having to tap
                    // through a dropdown - manual expand/collapse resumes
                    // once the query is cleared.
                    expanded={isSearching || expandedCategories.has(group.category)}
                    onToggle={isSearching ? undefined : () => toggleCategory(group.category)}
                    selectedIds={selectedIds}
                    onToggleSpecies={onToggle}
                  />
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CategoryDropdown({
  group,
  expanded,
  onToggle,
  selectedIds,
  onToggleSpecies,
}: {
  group: CategoryGroup;
  expanded: boolean;
  onToggle?: () => void;
  selectedIds: string[];
  onToggleSpecies: (id: string) => void;
}) {
  const option = getSpeciesCategoryOption(group.category);
  const selectedCount = group.species.filter((s) => selectedIds.includes(s.id)).length;

  return (
    <AccordionSection
      title={`${option.label} (${group.species.length})${selectedCount > 0 ? ` · ${selectedCount} tagged` : ""}`}
      icon={option.icon}
      expanded={expanded}
      onToggle={onToggle ?? (() => {})}
      lazy
    >
      {group.species.map((species) => (
        <SpeciesRow
          key={species.id}
          species={species}
          checked={selectedIds.includes(species.id)}
          onToggle={onToggleSpecies}
        />
      ))}
    </AccordionSection>
  );
}

function SpeciesRow({
  species,
  checked,
  onToggle,
}: {
  species: Species;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onToggle(species.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={species.commonName}
    >
      <Text style={styles.rowEmoji}>{species.emoji}</Text>
      <Text style={styles.rowLabel}>{species.commonName}</Text>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark-outline" size={14} color={colors.text.inverse} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: FIELD_FILL,
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    borderRadius: FIELD_RADIUS,
    paddingHorizontal: FIELD_PADDING_HORIZONTAL,
    paddingVertical: FIELD_PADDING_VERTICAL,
  },
  placeholder: {
    flex: 1,
    fontSize: typography.size.body,
    color: colors.text.muted,
  },
  selectedText: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.modalScrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  doneText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  search: {
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.size.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  nearbySection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
  },
  nearbySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  nearbySectionTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.secondary,
    letterSpacing: typography.tracking.wide,
    textTransform: "uppercase",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.page,
  },
  rowEmoji: {
    fontSize: typography.size.subtitle,
    width: 24,
    textAlign: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyText: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
