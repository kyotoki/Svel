import { useEffect } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// warmUpAsync/coolDownAsync are native-only (they manage Android Chrome
// Custom Tabs / iOS SFSafariViewController connections) - web has no such
// concept, and calling them there throws rather than no-opping, the same
// class of bug already fixed once for push notifications (see
// utils/notifications.ts's isSupportedPlatform). Guarded here the same way,
// at the call site, rather than assuming expo-web-browser handles it.
function isSupportedPlatform(): boolean {
  return Platform.OS !== "web";
}

// Pre-opens a browser connection on mount so the OAuth popup itself (Google/
// Apple sign-in - see components/auth/SocialSignInButtons.tsx) appears
// noticeably faster when the user actually taps a social sign-in button,
// instead of paying that cold-start cost at tap time. Primarily an Android
// win (warms up Chrome Custom Tabs); a genuine no-op on web, not just an
// unnecessary one - see isSupportedPlatform above.
export function useWarmUpBrowser() {
  useEffect(() => {
    if (!isSupportedPlatform()) {
      return;
    }
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
