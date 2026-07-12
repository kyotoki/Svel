import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

interface PrivacyControlsModalProps {
  visible: boolean;
  onClose: () => void;
}

// These toggles are visual placeholders only - nothing on the backend actually
// enforces map/log visibility yet (there's no follower/social layer in this
// app at all). They're here so the settings surface exists ahead of that
// feature landing, per the "Placeholders for managing..." framing this was
// requested with.
export default function PrivacyControlsModal({ visible, onClose }: PrivacyControlsModalProps) {
  const [publicMap, setPublicMap] = useState(false);
  const [publicLogs, setPublicLogs] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Privacy Controls</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Public Ocean Map</Text>
              <Text style={styles.rowSubtext}>Let other divers see your dive pins</Text>
            </View>
            <Switch value={publicMap} onValueChange={setPublicMap} accessibilityLabel="Public Ocean Map" />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Public Adventure Log</Text>
              <Text style={styles.rowSubtext}>Let other divers see your logged trips</Text>
            </View>
            <Switch
              value={publicLogs}
              onValueChange={setPublicLogs}
              accessibilityLabel="Public Adventure Log"
            />
          </View>

          <Text style={styles.note}>
            Sharing between divers isn't available yet - these are early previews of upcoming
            privacy settings.
          </Text>
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
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.page,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  rowSubtext: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  note: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    fontStyle: "italic",
    marginTop: spacing.md,
    lineHeight: typography.lineHeight.caption,
  },
});
