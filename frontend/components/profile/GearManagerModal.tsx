import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { Adventure } from "../../types/adventure";
import { computeGearUsage } from "../../utils/gearUsage";
import { GearItem } from "../../utils/profileStorage";

const GEAR_TYPES: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "wetsuit", label: "Wetsuit", icon: "body-outline" },
  { value: "fins", label: "Fins", icon: "footsteps-outline" },
  { value: "regulator", label: "Regulator", icon: "pulse-outline" },
  { value: "computer", label: "Dive Computer", icon: "watch-outline" },
  { value: "mask", label: "Mask / Snorkel", icon: "glasses-outline" },
  { value: "other", label: "Other", icon: "construct-outline" },
];

function iconForType(type: string): keyof typeof Ionicons.glyphMap {
  return GEAR_TYPES.find((t) => t.value === type)?.icon ?? "construct-outline";
}

function labelForType(type: string): string {
  return GEAR_TYPES.find((t) => t.value === type)?.label ?? "Other";
}

interface GearManagerModalProps {
  visible: boolean;
  onClose: () => void;
  gear: GearItem[];
  adventures: Adventure[];
  onUpdate: (gear: GearItem[]) => void;
}

export default function GearManagerModal({
  visible,
  onClose,
  gear,
  adventures,
  onUpdate,
}: GearManagerModalProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState(GEAR_TYPES[0].value);

  const addGear = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      return;
    }
    onUpdate([...gear, { id: `${Date.now()}`, name: trimmed, type: typeDraft }]);
    setNameDraft("");
  };

  const removeGear = (id: string) => {
    onUpdate(gear.filter((item) => item.id !== id));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Manage Equipment</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <FlatList
            data={gear}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No gear added yet. Add your wetsuit, fins, or computer below.
              </Text>
            }
            renderItem={({ item }) => {
              const usage = computeGearUsage(item.name, adventures);
              return (
                <View style={styles.gearRow}>
                  <View style={styles.gearIconBadge}>
                    <Ionicons name={iconForType(item.type)} size={18} color={colors.secondary} />
                  </View>
                  <View style={styles.gearInfo}>
                    <Text style={styles.gearName}>{item.name}</Text>
                    <Text style={styles.gearSubtext}>
                      {labelForType(item.type)} · Used on {usage.tripCount}{" "}
                      {usage.tripCount === 1 ? "adventure" : "adventures"}
                      {usage.tripCount > 0
                        ? ` · ${(usage.totalMinutes / 60).toFixed(1)} hrs`
                        : ""}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeGear(item.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              );
            }}
          />

          <Text style={styles.label}>ADD GEAR</Text>
          <View style={styles.typeRow}>
            {GEAR_TYPES.map((type) => {
              const selected = typeDraft === type.value;
              return (
                <Pressable
                  key={type.value}
                  onPress={() => setTypeDraft(type.value)}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                  hitSlop={6}
                  accessibilityRole="radio"
                  accessibilityLabel={type.label}
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={type.icon}
                    size={14}
                    color={selected ? colors.text.inverse : colors.secondary}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder={`e.g. ${labelForType(typeDraft)} name`}
              placeholderTextColor={colors.text.muted}
              value={nameDraft}
              onChangeText={setNameDraft}
              onSubmitEditing={addGear}
            />
            <Pressable
              style={styles.addButton}
              onPress={addGear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add gear"
            >
              <Ionicons name="add-outline" size={20} color={colors.text.inverse} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.modalScrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "80%",
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  list: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  gearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.page,
  },
  gearIconBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  gearInfo: {
    flex: 1,
  },
  gearName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  gearSubtext: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  typeChip: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipSelected: {
    backgroundColor: colors.secondary,
  },
  addRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.size.body,
    color: colors.text.primary,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
