import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { COUNTRIES, countryCodeToFlag } from "../../utils/countries";

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
}

export default function CountryPickerModal({ visible, onClose, onSelect }: CountryPickerModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return COUNTRIES;
    }
    return COUNTRIES.filter((country) => country.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Home Country</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Search countries..."
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onSelect(item.code);
                  setQuery("");
                  onClose();
                }}
              >
                <Text style={styles.flag}>{countryCodeToFlag(item.code)}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No countries match "{query}".</Text>}
          />
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
    maxWidth: 360,
    maxHeight: "70%",
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.page,
  },
  flag: {
    fontSize: typography.size.headline,
  },
  countryName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
  },
  emptyText: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
