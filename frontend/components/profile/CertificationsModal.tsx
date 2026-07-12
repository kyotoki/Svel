import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { CERTIFICATIONS } from "../../utils/certifications";

interface CertificationsModalProps {
  visible: boolean;
  onClose: () => void;
  certifications: string[];
  onToggle: (value: string) => void;
}

export default function CertificationsModal({
  visible,
  onClose,
  certifications,
  onToggle,
}: CertificationsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>My Certifications & Licenses</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Check off your real-world diving credentials to unlock certification badges.
          </Text>

          {CERTIFICATIONS.map((cert) => {
            const checked = certifications.includes(cert.value);
            return (
              <Pressable
                key={cert.value}
                style={styles.row}
                onPress={() => onToggle(cert.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Ionicons name="checkmark-outline" size={14} color={colors.text.inverse} />}
                </View>
                <Text style={styles.rowLabel}>{cert.label}</Text>
              </Pressable>
            );
          })}
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
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.small,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.page,
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
  rowLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
  },
});
