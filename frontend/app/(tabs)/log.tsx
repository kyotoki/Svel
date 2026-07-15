import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ActivityTypePicker from "../../components/log/ActivityTypePicker";
import DateOfAdventureField from "../../components/log/DateOfAdventureField";
import DiveMetricsFields from "../../components/log/DiveMetricsFields";
import FormField from "../../components/log/FormField";
import LocationFields from "../../components/log/LocationFields";
import PhotoPicker from "../../components/log/PhotoPicker";
import SpeciesPicker from "../../components/log/SpeciesPicker";
import TimeOfAdventureField from "../../components/log/TimeOfAdventureField";
import AnimatedPressable from "../../components/ui/AnimatedPressable";
import WaveSpinner from "../../components/ui/WaveSpinner";
import { TAB_BAR_HEIGHT } from "../../constants/layout";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useAdventureForm } from "../../hooks/useAdventureForm";
import { ActivityType } from "../../types/adventure";
import "../../utils/enableLayoutAnimation";

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function LogAdventureScreen() {
  const form = useAdventureForm();

  const handleActivityTypeChange = (next: ActivityType) => {
    // The Scuba/Snorkeling toggle adds or removes whole fields (Max Depth,
    // Scuba Gear) below it, so without this the rest of the form would jump
    // instantly rather than settling into place.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    form.handleActivityTypeChange(next);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ActivityTypePicker value={form.activityType} onChange={handleActivityTypeChange} />

          <DateOfAdventureField value={form.adventureDate} onChange={form.setAdventureDate} />
          <TimeOfAdventureField value={form.adventureTime} onChange={form.setAdventureTime} />

          <Text style={styles.sectionLabel}>DIVE DETAILS</Text>

          <FormField
            label="Title"
            placeholder="e.g. Coral Garden Drift Dive"
            value={form.form.title}
            onChangeText={(v) => form.updateField("title", v)}
            error={form.errors.title}
          />

          <FormField
            label="Location Name"
            placeholder="e.g. Great Barrier Reef"
            value={form.form.location_name}
            onChangeText={(v) => form.updateField("location_name", v)}
            error={form.errors.location_name}
          />

          <LocationFields
            locationMode={form.locationMode}
            latitude={form.form.latitude}
            longitude={form.form.longitude}
            latitudeError={form.errors.latitude}
            longitudeError={form.errors.longitude}
            onChangeLatitude={(v) => form.updateField("latitude", v)}
            onChangeLongitude={(v) => form.updateField("longitude", v)}
            locationQuery={form.locationQuery}
            onChangeLocationQuery={form.onLocationQueryChange}
            geocodeStatus={form.geocodeStatus}
            isGeocoding={form.isGeocoding}
            locationQueryError={form.locationQueryError}
            onVerifyLocation={form.onVerifyLocation}
            onToggleLocationMode={form.onToggleLocationMode}
          />

          <Text style={styles.sectionLabel}>DIVE METRICS</Text>

          <DiveMetricsFields
            showMaxDepth={form.tracksDepth}
            unitSystem={form.isImperial ? "imperial" : "metric"}
            maxDepth={form.form.max_depth_meters}
            onChangeMaxDepth={(v) => form.updateField("max_depth_meters", v)}
            maxDepthError={form.errors.max_depth_meters}
            duration={form.form.duration_minutes}
            onChangeDuration={(v) => form.updateField("duration_minutes", v)}
            durationError={form.errors.duration_minutes}
          />

          {form.isScuba && (
            <>
              <Text style={styles.sectionLabel}>SCUBA GEAR</Text>
              <FormField
                label="Tank Pressure (bar) (Optional)"
                placeholder="200 (Optional)"
                value={form.form.tank_pressure_bar}
                onChangeText={(v) => form.updateField("tank_pressure_bar", v)}
                error={form.errors.tank_pressure_bar}
                keyboardType="numeric"
              />
              <FormField
                label="Gas Mix (Optional)"
                placeholder="Air, Nitrox 32... (Optional)"
                value={form.form.gas_mix}
                onChangeText={(v) => form.updateField("gas_mix", v)}
              />
            </>
          )}

          <Text style={styles.sectionLabel}>MARINE LIFE</Text>
          <SpeciesPicker
            selectedIds={form.speciesIds}
            onToggle={form.toggleSpecies}
            latitude={parseCoordinate(form.form.latitude)}
            longitude={parseCoordinate(form.form.longitude)}
            activityType={form.activityType}
          />

          <Text style={styles.sectionLabel}>NOTES</Text>
          <FormField
            label="Notes (optional)"
            placeholder="Wildlife spotted, conditions, gear used..."
            value={form.form.notes}
            onChangeText={(v) => form.updateField("notes", v)}
            multiline
            hideLabel
          />

          <Text style={styles.sectionLabel}>PHOTOS</Text>
          <PhotoPicker
            photos={form.photos}
            maxPhotos={form.maxPhotos}
            isUploading={form.submitStage === "uploading-photo"}
            isSubmitting={form.isSubmitting}
            onTakePhoto={form.onTakePhoto}
            onChoosePhotos={form.onChoosePhotos}
            onRemovePhotoAt={form.removePhotoAt}
          />

          <AnimatedPressable
            style={[styles.submitButton, form.isSubmitting && styles.submitButtonDisabled]}
            onPress={form.handleSubmit}
            disabled={form.isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Log adventure"
            accessibilityState={{ disabled: form.isSubmitting, busy: form.isSubmitting }}
          >
            {form.isSubmitting ? (
              <>
                <WaveSpinner size="small" color={colors.text.inverse} />
                <Text style={styles.submitButtonText}>
                  {form.submitStage === "uploading-photo" ? "Uploading photo..." : "Saving..."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={colors.text.inverse} />
                <Text style={styles.submitButtonText}>Log Adventure</Text>
              </>
            )}
          </AnimatedPressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.surface.page,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl + TAB_BAR_HEIGHT,
  },
  sectionLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    letterSpacing: typography.tracking.wide,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
});
