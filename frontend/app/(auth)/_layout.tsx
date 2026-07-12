import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

import OceanLoadingScreen from "../../components/auth/OceanLoadingScreen";
import { useOnboardingStatus } from "../../utils/useOnboardingStatus";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const onboardingStatus = useOnboardingStatus(isSignedIn);

  if (!isLoaded) {
    return <OceanLoadingScreen />;
  }

  if (isSignedIn) {
    if (onboardingStatus === "checking") {
      return <OceanLoadingScreen />;
    }
    return <Redirect href={onboardingStatus === "needed" ? "/onboarding" : "/"} />;
  }

  // Sign-in <-> sign-up navigates via <Link replace>, not a push - "fade"
  // matches the root Stack's explicit choice (app/_layout.tsx) for the same
  // reason: a swap, not a back-stack the user would expect to pop through.
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
