import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, elevation, radius, spacing, typography } from "../../constants/theme";
import { CERTIFICATIONS } from "../../utils/certifications";
import { countryCodeToFlag, COUNTRIES } from "../../utils/countries";
import { LocalProfileFields } from "../../utils/profileStorage";
import CountryPickerModal from "./CountryPickerModal";

interface ProfileCoreCardProps {
  profile: LocalProfileFields;
  onUpdate: (next: Partial<LocalProfileFields>) => void;
}

export default function ProfileCoreCard({ profile, onUpdate }: ProfileCoreCardProps) {
  const [bioDraft, setBioDraft] = useState(profile.bio);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);

  const toggleCertification = (name: string) => {
    const next = profile.certifications.includes(name)
      ? profile.certifications.filter((c) => c !== name)
      : [...profile.certifications, name];
    onUpdate({ certifications: next });
  };

  const homeCountry = COUNTRIES.find((c) => c.code === profile.homeCountryCode);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>BIO</Text>
      <TextInput
        style={styles.bioInput}
        placeholder="Add a short bio about your diving journey..."
        placeholderTextColor={colors.text.muted}
        value={bioDraft}
        onChangeText={setBioDraft}
        onBlur={() => onUpdate({ bio: bioDraft })}
        multiline
        numberOfLines={3}
        maxLength={280}
      />

      <Text style={styles.label}>HOME COUNTRY</Text>
      <Pressable
        style={styles.countryRow}
        onPress={() => setIsCountryPickerVisible(true)}
        accessibilityRole="button"
      >
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

      <Text style={styles.label}>CERTIFICATIONS</Text>
      <View style={styles.chipsRow}>
        {CERTIFICATIONS.map((cert) => {
          const selected = profile.certifications.includes(cert.value);
          return (
            <Pressable
              key={cert.value}
              onPress={() => toggleCertification(cert.value)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              <Ionicons
                name="ribbon-outline"
                size={13}
                color={selected ? colors.text.inverse : colors.secondary}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cert.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <CountryPickerModal
        visible={isCountryPickerVisible}
        onClose={() => setIsCountryPickerVisible(false)}
        onSelect={(code) => onUpdate({ homeCountryCode: code })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...elevation.card,
  },
  label: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  bioInput: {
    fontSize: typography.size.body,
    color: colors.text.label,
    lineHeight: typography.lineHeight.body,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.page,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  flag: {
    fontSize: typography.size.small,
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
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.tint,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.secondary,
  },
  chipText: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    color: colors.secondary,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
});
