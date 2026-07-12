import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { FeedbackSource, submitFeedback } from "../../utils/formspree";
import WaveSpinner from "../ui/WaveSpinner";

interface FeedbackModalProps {
  visible: boolean;
  source: FeedbackSource;
  appVersion: string;
  onClose: () => void;
}

type Status = "idle" | "submitting" | "success" | "error";

const COPY: Record<FeedbackSource, { title: string; placeholder: string }> = {
  feedback: {
    title: "Send Feedback",
    placeholder: "Suggest a species that's missing from the picker, report a bug, or share an idea...",
  },
  contact: {
    title: "Contact Us",
    placeholder: "How can we help?",
  },
};

// The one form behind both Send Feedback and Contact Us - same text box,
// same submit flow, same success/error states. What differs is `source`
// (included in every submission so Formspree/the resulting email can tell
// the two apart - see utils/formspree.ts) and, for feedback specifically,
// a diagnostic block attached automatically rather than shown as a field
// here for the user to fill in.
export default function FeedbackModal({ visible, source, appVersion, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const copy = COPY[source];

  const resetShortly = () => {
    // Delayed rather than immediate - clearing synchronously would flash
    // the form back to blank while the close animation is still playing.
    setTimeout(() => {
      setMessage("");
      setStatus("idle");
    }, 300);
  };

  const handleClose = () => {
    onClose();
    resetShortly();
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || status === "submitting") {
      return;
    }
    setStatus("submitting");
    const ok = await submitFeedback({ message: trimmed, source, appVersion });
    setStatus(ok ? "success" : "error");
  };

  const canSubmit = message.trim().length > 0 && status !== "submitting";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{status === "success" ? "Thanks!" : copy.title}</Text>
            <Pressable onPress={handleClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {status === "success" ? (
            <View style={styles.statusWrap}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
              <Text style={styles.statusText}>Thanks, we got it.</Text>
              <Pressable style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder={copy.placeholder}
                placeholderTextColor={colors.text.muted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                editable={status !== "submitting"}
                autoFocus
              />

              {status === "error" && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>
                    Something went wrong sending this - check your connection and try again.
                  </Text>
                </View>
              )}

              <Pressable
                testID="feedback-submit-button"
                style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {status === "submitting" ? (
                  <WaveSpinner size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.submitButtonText}>Send</Text>
                )}
              </Pressable>
            </>
          )}
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
  input: {
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.size.body,
    color: colors.text.primary,
    minHeight: 120,
    textAlignVertical: "top",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.caption,
    color: colors.error,
    lineHeight: typography.lineHeight.caption,
  },
  submitButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  statusWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  statusText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: "center",
  },
  doneButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  doneButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
});
