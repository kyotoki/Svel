import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import OceanLoadingScreen from "../components/auth/OceanLoadingScreen";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import { AnalyticsEvents, track } from "../utils/analytics";
import { tokenCache } from "../utils/tokenCache";

// Must run once at module scope, before any OAuth flow starts (social
// sign-in - see components/auth/SocialSignInButtons.tsx) - this is what
// lets the in-app browser actually close and hand control back to the app
// once Google/Apple redirects back after the user authenticates, instead of
// leaving the browser tab open waiting.
WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in frontend/.env."
  );
}

export default function RootLayout() {
  // Fires once per cold start of the root layout - the simplest faithful
  // reading of "app opened" as a retention event, independent of whether the
  // user is signed in yet (auth state itself is a separate concern).
  useEffect(() => {
    track(AnalyticsEvents.AppOpened);
  }, []);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <StatusBar style="light" />
      <ClerkLoading>
        <OceanLoadingScreen />
      </ClerkLoading>
      <ClerkLoaded>
        <PreferencesProvider>
          {/*
            These three routes swap via <Redirect> based on auth/onboarding
            state, not user-driven push/pop navigation - "fade" reads as a
            mode change rather than implying a back-stack the user could pop
            through. Set explicitly rather than left to each platform's
            differing native-stack default (iOS defaults to a slide, Android
            historically to a different native transition), so the motion is
            the same on both rather than incidentally different.
          */}
          <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </PreferencesProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
