import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { countryCodeToFlag, COUNTRIES } from "../../utils/countries";
import { showAlert } from "../../utils/crossPlatformAlert";
import { LocalProfileFields } from "../../utils/profileStorage";
import { UnitSystem } from "../../utils/units";
import CountryPickerModal from "./CountryPickerModal";
import SegmentedControl from "./SegmentedControl";
import SettingsRow from "./SettingsRow";

const UNIT_SYSTEM_OPTIONS = [
  { value: "metric" as const, label: "Metric" },
  { value: "imperial" as const, label: "Imperial" },
];

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: LocalProfileFields;
  onUpdateProfile: (next: Partial<LocalProfileFields>) => void;
  gearSubtext: string;
  onManageGear: () => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (value: UnitSystem) => void;
  mapStyleLabel: string;
  onMapPreferences: () => void;
  onPrivacyControls: () => void;
}

export default function EditProfileModal({
  visible,
  onClose,
  profile,
  onUpdateProfile,
  gearSubtext,
  onManageGear,
  unitSystem,
  onUnitSystemChange,
  mapStyleLabel,
  onMapPreferences,
  onPrivacyControls,
}: EditProfileModalProps) {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [bioDraft, setBioDraft] = useState(profile.bio);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (visible) {
      setFirstName(user?.firstName ?? "");
      setLastName(user?.lastName ?? "");
      setBioDraft(profile.bio);
    }
  }, [visible, user, profile.bio]);

  const homeCountry = COUNTRIES.find((c) => c.code === profile.homeCountryCode);

  const handleClose = async () => {
    onUpdateProfile({ bio: bioDraft });
    const nameChanged = firstName !== (user?.firstName ?? "") || lastName !== (user?.lastName ?? "");
    if (nameChanged && user) {
      setIsSavingName(true);
      try {
        await user.update({ firstName, lastName });
      } catch {
        showAlert("Unable to update name", "Check your connection and try again.");
      } finally {
        setIsSavingName(false);
      }
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Account</Text>
            <Pressable onPress={handleClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>NAME</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="First name"
              placeholderTextColor={colors.text.muted}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Last name"
              placeholderTextColor={colors.text.muted}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </Text>
          </View>
          <Text style={styles.helperText}>
            Changing your email requires verification and isn't available here yet.
          </Text>

          <Text style={styles.label}>BIO</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Add a short bio about your diving journey..."
            placeholderTextColor={colors.text.muted}
            value={bioDraft}
            onChangeText={setBioDraft}
            multiline
            numberOfLines={3}
            maxLength={280}
          />

          <Text style={styles.label}>HOME COUNTRY</Text>
          <Pressable style={styles.countryRow} onPress={() => setIsCountryPickerVisible(true)}>
            {homeCountry ? (
              <>
                <Text style={styles.flag}>{countryCodeToFlag(homeCountry.code)}</Text>
                <Text style={styles.countryName}>{homeCountry.name}</Text>
              </>
            ) : (
              <Text style={styles.countryPlaceholder}>Select your home country</Text>
            )}
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color={colors.text.tertiary}
              style={styles.countryChevron}
            />
          </Pressable>

          <Text style={styles.label}>PREFERENCES</Text>
          <SettingsRow
            icon="bag-handle-outline"
            label="Manage Equipment"
            subtext={gearSubtext}
            onPress={onManageGear}
          />
          <SettingsRow
            icon="thermometer-outline"
            label="Unit Measurements"
            rightElement={
              <View style={styles.unitToggleWrap}>
                <SegmentedControl
                  options={UNIT_SYSTEM_OPTIONS}
                  value={unitSystem}
                  onChange={onUnitSystemChange}
                />
              </View>
            }
          />
          <SettingsRow
            icon="map-outline"
            label="Map Preferences"
            subtext={mapStyleLabel}
            onPress={onMapPreferences}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Privacy Controls"
            subtext="Manage who can see your map & logs"
            onPress={onPrivacyControls}
          />

          <Pressable
            style={[styles.saveButton, isSavingName && styles.saveButtonDisabled]}
            onPress={handleClose}
            disabled={isSavingName}
          >
            <Text style={styles.saveButtonText}>{isSavingName ? "Saving..." : "Done"}</Text>
          </Pressable>

          <CountryPickerModal
            visible={isCountryPickerVisible}
            onClose={() => setIsCountryPickerVisible(false)}
            onSelect={(code) => onUpdateProfile({ homeCountryCode: code })}
          />
          </ScrollView>
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
    maxHeight: "85%",
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
  // The PREFERENCES section below made this modal's content routinely taller
  // than the card's maxHeight - without an inner scroll, the fields further
  // down (and the Done button) would be unreachable on smaller screens. The
  // header stays outside this, so it's always pinned above the scrolling
  // content instead of scrolling away with it.
  scrollBody: {
    flexGrow: 0,
  },
  title: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
    // Without this, a flex child's default min-width is its content's
    // intrinsic width (a react-native-web/CSS flexbox default), not 0 - a
    // long last name could grow this box past the row's available space and
    // push it outside the card's bounds instead of wrapping/shrinking to fit.
    minWidth: 0,
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
  },
  bioInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  readOnlyField: {
    backgroundColor: colors.surface.page,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  readOnlyText: {
    fontSize: typography.size.body,
    color: colors.text.secondary,
  },
  helperText: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
    fontStyle: "italic",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.page,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  flag: {
    fontSize: typography.size.subtitle,
  },
  countryName: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.label,
    flex: 1,
  },
  countryPlaceholder: {
    fontSize: typography.size.body,
    color: colors.text.tertiary,
    flex: 1,
  },
  countryChevron: {
    marginLeft: "auto",
  },
  unitToggleWrap: {
    width: 150,
  },
  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
});
