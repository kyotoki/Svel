import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  FIELD_BORDER,
  FIELD_FILL,
  FIELD_PADDING_HORIZONTAL,
  FIELD_PADDING_VERTICAL,
  FIELD_RADIUS,
} from "../../constants/fieldStyle";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { formatTimeHHMM } from "../../utils/date";

interface TimeOfAdventureFieldProps {
  // null = not set - a normal, common state (unlike DateOfAdventureField's
  // value, time is optional: someone who doesn't remember exactly when they
  // dove can still log without it).
  value: Date | null;
  onChange: (time: Date | null) => void;
}

function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function TimeOfAdventureField({ value, onChange }: TimeOfAdventureFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Same web-fallback reasoning as DateOfAdventureField: the native picker
  // has no web implementation at all (silently renders nothing), so web
  // needs its own real <input> instead.
  if (Platform.OS === "web") {
    return React.createElement(
      "label",
      { style: webRowStyle },
      <View style={styles.rowLeft} key="left">
        <View style={styles.iconBadge}>
          <Ionicons name="time-outline" size={17} color={colors.primary} />
        </View>
        <Text style={styles.rowLabel}>Time of Adventure</Text>
      </View>,
      <Text style={webPlaceholderStyle} key="placeholder">
        Optional
      </Text>,
      React.createElement("input", {
        key: "input",
        type: "time",
        value: value ? formatTimeHHMM(value) : "",
        onChange: (event: { target: { value: string } }) => {
          if (!event.target.value) {
            onChange(null);
            return;
          }
          const [hours, minutes] = event.target.value.split(":").map(Number);
          const next = value ? new Date(value) : new Date();
          next.setHours(hours, minutes, 0, 0);
          onChange(next);
        },
        style: webInputStyle,
      })
    );
  }

  const openPicker = () => {
    const initialValue = value ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initialValue,
        mode: "time",
        onChange: (_event: DateTimePickerEvent, selectedTime?: Date) => {
          if (selectedTime) {
            onChange(selectedTime);
          }
        },
      });
      return;
    }
    setIsPickerVisible(true);
  };

  return (
    <>
      <Pressable
        style={styles.row}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={
          value ? `Time of adventure, ${formatDisplayTime(value)}` : "Time of adventure, not set"
        }
      >
        <View style={styles.rowLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="time-outline" size={17} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>Time of Adventure</Text>
        </View>
        <View style={styles.rowRight}>
          {value ? (
            <>
              <Text style={styles.rowValue}>{formatDisplayTime(value)}</Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear time"
              >
                <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
              </Pressable>
            </>
          ) : (
            <Text style={styles.rowPlaceholder}>Optional</Text>
          )}
          <Ionicons name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
        </View>
      </Pressable>

      {isPickerVisible && (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setIsPickerVisible(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setIsPickerVisible(false)}>
            <Pressable style={styles.pickerCard} onPress={(e) => e?.stopPropagation()}>
              <DateTimePicker
                value={value ?? new Date()}
                mode="time"
                display="spinner"
                onChange={(_event, selectedTime) => {
                  if (selectedTime) {
                    onChange(selectedTime);
                  }
                }}
              />
              <View style={styles.pickerActions}>
                <Pressable
                  style={styles.clearButton}
                  onPress={() => {
                    onChange(null);
                    setIsPickerVisible(false);
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </Pressable>
                <Pressable style={styles.doneButton} onPress={() => setIsPickerVisible(false)}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const webRowStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: FIELD_FILL,
  border: `1.5px solid ${FIELD_BORDER}`,
  borderRadius: FIELD_RADIUS,
  paddingLeft: FIELD_PADDING_HORIZONTAL,
  paddingRight: FIELD_PADDING_HORIZONTAL,
  paddingTop: FIELD_PADDING_VERTICAL,
  paddingBottom: FIELD_PADDING_VERTICAL,
  marginBottom: spacing.lg,
  cursor: "pointer",
  gap: 8,
} as const;

const webPlaceholderStyle = {
  fontSize: typography.size.caption,
  color: colors.text.tertiary,
  marginRight: "auto",
} as const;

const webInputStyle = {
  fontSize: typography.size.body,
  fontWeight: typography.weight.semibold,
  color: colors.primary,
  border: "none",
  background: "transparent",
  textAlign: "right",
  cursor: "pointer",
} as const;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: FIELD_FILL,
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    borderRadius: FIELD_RADIUS,
    paddingHorizontal: FIELD_PADDING_HORIZONTAL,
    paddingVertical: FIELD_PADDING_VERTICAL,
    marginBottom: spacing.lg,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowValue: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  rowPlaceholder: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.modalScrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  pickerActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.surface.tint,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },
  doneButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
});
