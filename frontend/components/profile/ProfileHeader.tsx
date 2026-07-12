import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, radius, spacing, typography, withOpacity } from "../../constants/theme";
import { Country } from "../../utils/countries";
import PhotoThumbnail from "../ui/PhotoThumbnail";
import SettingsCogButton from "./SettingsCogButton";

// The avatar wrapper is 84x84 with a 3px border and 3px padding on every
// side (see avatarWrap below) - the actual image fills what's left inside
// that, not the full 84.
const AVATAR_IMAGE_SIZE = 84 - 2 * 3 - 2 * 3;

interface ProfileHeaderProps {
  avatarUri: string | null;
  onAvatarPress: () => void;
  onOpenSettings: () => void;
  displayName: string;
  hasBio: boolean;
  bio: string;
  homeCountry: Country | undefined;
  countryCodeToFlag: (code: string) => string;
}

export default function ProfileHeader({
  avatarUri,
  onAvatarPress,
  onOpenSettings,
  displayName,
  hasBio,
  bio,
  homeCountry,
  countryCodeToFlag,
}: ProfileHeaderProps) {
  return (
    <LinearGradient colors={gradients.deepOcean} style={styles.header}>
      <View style={styles.settingsCogWrap}>
        <SettingsCogButton onPress={onOpenSettings} />
      </View>
      <Pressable
        style={({ pressed }) => [styles.avatarWrap, pressed && styles.avatarWrapPressed]}
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        {avatarUri ? (
          <PhotoThumbnail
            uri={avatarUri}
            size={AVATAR_IMAGE_SIZE}
            borderRadius={radius.full}
            fallbackIcon="person-outline"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person-outline" size={30} color={colors.text.inverse} />
          </View>
        )}
        <View style={styles.avatarOverlay}>
          <Ionicons name="camera-outline" size={18} color={colors.text.inverse} />
        </View>
        <View style={styles.avatarEditBadge}>
          <Ionicons name="camera-outline" size={14} color={colors.secondary} />
        </View>
      </Pressable>
      <View style={styles.identityCard}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={hasBio ? styles.bio : styles.bioPlaceholder} numberOfLines={2}>
          {hasBio ? bio : "Add a bio..."}
        </Text>
        <View style={styles.homeCountryRow}>
          {homeCountry ? (
            <>
              <Text style={styles.homeCountryFlag}>{countryCodeToFlag(homeCountry.code)}</Text>
              <Text style={styles.homeCountryText}>{homeCountry.name}</Text>
            </>
          ) : (
            <Text style={styles.homeCountryPlaceholder}>Select your home country</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    marginBottom: spacing.md,
  },
  settingsCogWrap: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: withOpacity(colors.accent, 0.6),
    padding: 3,
    marginBottom: spacing.md,
  },
  avatarWrapPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    backgroundColor: withOpacity(colors.surface.card, 0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlay: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: radius.full,
    backgroundColor: colors.overlay.scrimLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },
  identityCard: {
    alignSelf: "stretch",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: withOpacity(colors.surface.card, 0.06),
    borderWidth: 1,
    borderColor: withOpacity(colors.surface.card, 0.12),
    // A one-off card shadow (opacity/elevation don't match the standard
    // "card" preset) - only the color is shared with the rest of the app.
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  bio: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverseStrong,
    textAlign: "center",
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xs,
  },
  bioPlaceholder: {
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    fontStyle: "italic",
    color: colors.text.inverseFaint,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  homeCountryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  homeCountryFlag: {
    fontSize: typography.size.small,
  },
  homeCountryText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverseMuted,
  },
  homeCountryPlaceholder: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    fontStyle: "italic",
    color: colors.text.inverseFaint,
  },
});
