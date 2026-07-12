import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getStoreUrl, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "../../constants/links";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { showAlert } from "../../utils/crossPlatformAlert";
import { FeedbackSource } from "../../utils/formspree";
import FeedbackModal from "./FeedbackModal";
import SettingsRow from "./SettingsRow";
import SvelProRow from "./SvelProRow";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface SettingsMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onOpenSvelPro: () => void;
  onLogOut: () => void;
  appVersion: string;
}

export default function SettingsMenuModal({
  visible,
  onClose,
  onEditProfile,
  onOpenSvelPro,
  onLogOut,
  appVersion,
}: SettingsMenuModalProps) {
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  // null = closed; "feedback"/"contact" both open the same FeedbackModal,
  // just with a different source (see utils/formspree.ts) - one form
  // component and one endpoint behind both entry points.
  const [feedbackSource, setFeedbackSource] = useState<FeedbackSource | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    } else {
      translateX.setValue(SCREEN_WIDTH);
    }
  }, [visible, translateX]);

  const handleRateSvel = () => {
    Linking.openURL(getStoreUrl()).catch(() => {
      showAlert("Unable to open store", "Please try again later.");
    });
  };

  const handleShareSvel = () => {
    Share.share({
      message: `Check out Svel, the dive/snorkel/freedive logbook app! ${getStoreUrl()}`,
    }).catch(() => {
      // The native share sheet being dismissed/cancelled also rejects on
      // some platforms - nothing to surface to the user either way.
    });
  };

  const handleDeleteAccount = () => {
    // Account deletion has no backend support yet (no endpoint, no Clerk
    // account removal wired up) - this is a real, working row that's honest
    // about that rather than a dead end, not a fake "deleted!" confirmation.
    showAlert(
      "Delete Account",
      "Account deletion isn't available in the app yet. Contact us and we'll take care of it for you.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Contact Us", onPress: () => setFeedbackSource("contact") },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <Pressable style={styles.panelInner} onPress={(e) => e?.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Settings</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.brandBlock}>
              <Image
                source={require("../../assets/images/svellogo-mark.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>Svel</Text>
              <Text style={styles.brandVersion}>v{appVersion}</Text>
            </View>

            <SvelProRow onPress={onOpenSvelPro} />

            <SettingsRow
              icon="person-circle-outline"
              label="Account"
              subtext="Profile, gear, units & privacy"
              onPress={onEditProfile}
            />
            <SettingsRow icon="log-out-outline" label="Log Out" destructive onPress={onLogOut} />

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>SUPPORT</Text>
            <SettingsRow icon="star-outline" label="Rate Svel" onPress={handleRateSvel} />
            <SettingsRow icon="share-social-outline" label="Share Svel" onPress={handleShareSvel} />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label="Send Feedback"
              subtext="Suggest a species or share an idea"
              onPress={() => setFeedbackSource("feedback")}
            />
            <SettingsRow icon="mail-outline" label="Contact Us" onPress={() => setFeedbackSource("contact")} />

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>LEGAL</Text>
            <SettingsRow
              icon="document-text-outline"
              label="Privacy Policy"
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            />
            <SettingsRow
              icon="reader-outline"
              label="Terms of Use"
              onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            />

            <View style={styles.dangerZone}>
              <SettingsRow icon="trash-outline" label="Delete Account" destructive onPress={handleDeleteAccount} />
            </View>
          </ScrollView>
        </Pressable>
        </Animated.View>
      </Pressable>

      <FeedbackModal
        visible={feedbackSource !== null}
        source={feedbackSource ?? "feedback"}
        appVersion={appVersion}
        onClose={() => setFeedbackSource(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: colors.overlay.modalScrim,
  },
  panel: {
    width: "82%",
    maxWidth: 340,
    height: "100%",
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xxl,
    borderBottomLeftRadius: radius.xxl,
    // One-off drawer shadow (negative horizontal offset, doesn't match any
    // standard elevation preset) - only the color is shared with them.
    shadowColor: colors.shadowColor,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  panelInner: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
  },
  brandBlock: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  // The mark's native crop is portrait (~185x300) - sized to preserve that
  // ratio. No border radius needed anymore: it's a transparent PNG of just
  // the mark now, not a square photo that needed corner-clipping.
  brandLogo: {
    width: 34,
    height: 55,
    marginBottom: spacing.xs,
  },
  brandName: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  brandVersion: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  sectionLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xxs,
  },
  sectionLabelSpaced: {
    marginTop: spacing.lg,
  },
  // flexGrow: 0 (not flex: 1) keeps this sized to its content rather than
  // stretching - the drawer's height still comes from `panel`, and this is
  // what makes everything below the pinned header actually scroll instead
  // of silently overflowing the drawer's bounds once it's taller than the
  // screen (a real risk now that this menu has this much more content than
  // before - see EditProfileModal.tsx's identical fix for the same reason).
  scrollBody: {
    flexGrow: 0,
  },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    marginTop: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
