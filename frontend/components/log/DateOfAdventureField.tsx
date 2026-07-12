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
import { formatDateISO } from "../../utils/date";

interface DateOfAdventureFieldProps {
  value: Date;
  onChange: (date: Date) => void;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DateOfAdventureField({ value, onChange }: DateOfAdventureFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // react-native-community/datetimepicker has no web implementation - its
  // fallback component renders null and just console.warns "not supported on:
  // web" - so on web this row needs to fall back to a native HTML date
  // input instead of silently doing nothing when tapped. That input is
  // wrapped in a real <label> (rather than just sitting inside a plain View)
  // so a click anywhere in the row - not just directly on the small input -
  // focuses it and opens the picker, per standard HTML label behavior.
  if (Platform.OS === "web") {
    return React.createElement(
      "label",
      { style: webRowStyle },
      <View style={styles.rowLeft} key="left">
        <View style={styles.iconBadge}>
          <Ionicons name="calendar-outline" size={17} color={colors.primary} />
        </View>
        <Text style={styles.rowLabel}>Date of Adventure</Text>
      </View>,
      React.createElement("input", {
        key: "input",
        type: "date",
        value: formatDateISO(value),
        max: formatDateISO(new Date()),
        onChange: (event: { target: { value: string } }) => {
          const [year, month, day] = event.target.value.split("-").map(Number);
          if (year && month && day) {
            onChange(new Date(year, month - 1, day));
          }
        },
        style: webInputStyle,
      })
    );
  }

  const openPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        maximumDate: new Date(),
        onChange: (_event: DateTimePickerEvent, selectedDate?: Date) => {
          if (selectedDate) {
            onChange(selectedDate);
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
        accessibilityLabel={`Date of adventure, ${formatDisplayDate(value)}`}
      >
        <View style={styles.rowLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel}>Date of Adventure</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowValue}>{formatDisplayDate(value)}</Text>
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
                value={value}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    onChange(selectedDate);
                  }
                }}
              />
              <Pressable style={styles.doneButton} onPress={() => setIsPickerVisible(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

// Raw CSS (not an RN StyleSheet object) since this styles a real DOM <label>
// created via React.createElement rather than a react-native-web <View> -
// RN-only shorthands like paddingHorizontal/borderWidth don't apply here.
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
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xxs,
  },
  doneButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
});
