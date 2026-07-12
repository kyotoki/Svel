import { useSSO } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useWarmUpBrowser } from "../../hooks/useWarmUpBrowser";

type Provider = "oauth_google";

interface SocialSignInButtonsProps {
  /** Reuses the caller's own error Text UI (both sign-in.tsx and sign-up.tsx
   * already have one for the email/password flow) rather than this
   * component inventing a second, separate error surface. */
  onError: (message: string) => void;
}

// The same component powers both sign-in and sign-up screens - Clerk's SSO
// flow doesn't need to be told which one this is; it transparently signs an
// existing user in or creates a new account on first OAuth completion,
// exactly the friction reduction the button exists for (no separate
// "already have an account?" branch to get wrong here).
//
// Rendered below the email/password form, not above it - matches the
// convention on most sign-in pages (primary form first, social auth as a
// secondary option underneath a "or continue with" divider) rather than
// leading with it.
//
// Apple is shown but disabled ("Coming Soon") rather than wired to Clerk's
// SSO flow - Apple's OAuth isn't configured in the Clerk dashboard yet
// (blocked on Apple Developer Program approval), so it has nothing to
// start.
export default function SocialSignInButtons({ onError }: SocialSignInButtonsProps) {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const isBusy = loadingProvider !== null;

  const handlePress = async (strategy: Provider) => {
    setLoadingProvider(strategy);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // No router.replace here - (auth)/_layout.tsx's own redirect fires
        // the instant isSignedIn flips true, the same reasoning already
        // applied to sign-up's email-code verification completion.
      }
      // A null createdSessionId with no thrown error means the user closed
      // the browser/cancelled the OAuth flow - not a failure worth
      // surfacing as an error.
    } catch (err: any) {
      onError(err?.errors?.[0]?.longMessage ?? "Unable to continue - please try again.");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={() => handlePress("oauth_google")}
        disabled={isBusy}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: isBusy, busy: loadingProvider === "oauth_google" }}
      >
        {loadingProvider === "oauth_google" ? (
          <ActivityIndicator color="#1F1F1F" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#1F1F1F" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.appleButton, styles.appleButtonDisabled]}
        disabled
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
        accessibilityState={{ disabled: true }}
      >
        <Ionicons name="logo-apple" size={20} color="rgba(0,0,0,0.35)" />
        <Text style={styles.appleButtonTextDisabled}>Apple - Coming Soon</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 10,
  },
  // White, not the app's dark-gradient palette - both Google's and Apple's
  // own brand guidelines specify a light/white button be used on a dark or
  // colored background (Apple explicitly calls this the "white" variant,
  // meant for exactly this context), not a themed color.
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  googleButtonText: {
    color: "#1F1F1F",
    fontSize: 15,
    fontWeight: "600",
  },
  appleButton: {
    backgroundColor: "#FFFFFF",
  },
  appleButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  appleButtonTextDisabled: {
    color: "rgba(0,0,0,0.35)",
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  dividerText: {
    color: "#8FB8CE",
    fontSize: 12,
    fontWeight: "600",
  },
});
