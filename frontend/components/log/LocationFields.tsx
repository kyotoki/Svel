import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { GeocodeStatus, LocationInputMode } from "../../hooks/useAdventureForm";
import WaveSpinner from "../ui/WaveSpinner";
import FormField from "./FormField";

interface LocationFieldsProps {
  locationMode: LocationInputMode;
  latitude: string;
  longitude: string;
  latitudeError?: string;
  longitudeError?: string;
  onChangeLatitude: (value: string) => void;
  onChangeLongitude: (value: string) => void;
  locationQuery: string;
  onChangeLocationQuery: (value: string) => void;
  geocodeStatus: GeocodeStatus;
  isGeocoding: boolean;
  locationQueryError?: string;
  onVerifyLocation: () => void;
  onToggleLocationMode: () => void;
}

export default function LocationFields({
  locationMode,
  latitude,
  longitude,
  latitudeError,
  longitudeError,
  onChangeLatitude,
  onChangeLongitude,
  locationQuery,
  onChangeLocationQuery,
  geocodeStatus,
  isGeocoding,
  locationQueryError,
  onVerifyLocation,
  onToggleLocationMode,
}: LocationFieldsProps) {
  return (
    <>
      {locationMode === "coordinates" ? (
        <View style={styles.row}>
          <FormField
            label="Latitude"
            placeholder="-16.7500"
            value={latitude}
            onChangeText={onChangeLatitude}
            error={latitudeError}
            keyboardType="numbers-and-punctuation"
            containerStyle={styles.halfField}
          />
          <FormField
            label="Longitude"
            placeholder="145.6667"
            value={longitude}
            onChangeText={onChangeLongitude}
            error={longitudeError}
            keyboardType="numbers-and-punctuation"
            containerStyle={styles.halfField}
          />
        </View>
      ) : (
        <View>
          <FormField
            label="Enter Location Name or Address (e.g., Key West, Florida)"
            placeholder="Key West, Florida"
            value={locationQuery}
            onChangeText={onChangeLocationQuery}
          />
          <TouchableOpacity
            style={[styles.verifyButton, isGeocoding && styles.verifyButtonDisabled]}
            onPress={onVerifyLocation}
            disabled={isGeocoding}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Verify location"
            accessibilityState={{ disabled: isGeocoding, busy: isGeocoding }}
          >
            {isGeocoding ? (
              <WaveSpinner size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Location</Text>
            )}
          </TouchableOpacity>

          {geocodeStatus === "success" && (
            <View style={styles.geocodeFeedbackRow} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.geocodeSuccessText}>Location found! Mapping coordinates...</Text>
            </View>
          )}
          {locationQueryError && (
            <Text style={styles.geocodeErrorText} accessibilityLiveRegion="polite">
              {locationQueryError}
            </Text>
          )}
        </View>
      )}

      <View style={styles.locationModeRow}>
        <TouchableOpacity onPress={onToggleLocationMode} hitSlop={8} accessibilityRole="button">
          <Text style={styles.locationModeToggle}>
            {locationMode === "coordinates"
              ? "Search by Location Name instead"
              : "Enter coordinates instead"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  locationModeRow: {
    alignItems: "flex-end",
    marginBottom: spacing.xs,
  },
  locationModeToggle: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  verifyButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  geocodeFeedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  geocodeSuccessText: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.success,
  },
  geocodeErrorText: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
});
