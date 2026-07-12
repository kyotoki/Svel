import { Platform } from "react-native";

// Placeholder destinations - Svel has no published App Store/Play Store
// listing or hosted legal pages yet. Every consumer reads from here, so
// swapping these to the real URLs later (once they exist) is a one-line
// change per constant, not a hunt through the settings menu for hardcoded
// links buried in JSX.
export const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.svel.app";
export const PRIVACY_POLICY_URL = "https://svel.app/privacy";
export const TERMS_OF_USE_URL = "https://svel.app/terms";
// Where Formspree forwards every Send Feedback/Contact Us submission (see
// utils/formspree.ts) - not used directly in a mailto: link anymore, but
// still the real destination address, worth keeping documented here.
export const SUPPORT_EMAIL = "hello@svel.app";

// Same Formspree form the marketing landing page's email signup already
// posts to (website/index.html), reused here instead of a second form -
// see utils/formspree.ts for the in-app submission (a JSON POST, since
// there's no native <form> to submit the way the static landing page does).
export const FORMSPREE_URL = "https://formspree.io/f/xzdnpgop";

export function getStoreUrl(): string {
  return Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
}

// iOS's Platform.Version is the actual OS version ("17.4"); Android's is
// the API level (e.g. 34), not a marketing version string - there's no
// dependency-free way to get Android's "14"-style version without
// expo-device, which isn't installed, so this is labeled as an API level
// there rather than presented as something it isn't.
function osDescription(): string {
  if (Platform.OS === "ios") {
    return `iOS ${Platform.Version}`;
  }
  if (Platform.OS === "android") {
    return `Android (API ${Platform.Version})`;
  }
  return "Web";
}

// Appended below a feedback email's body - not mixed into a prompt the
// tester would have to delete to write their own message. Kept as its own
// function (rather than inlined at the one call site) so its exact format
// is covered by a unit test independent of the settings menu component.
export function buildDiagnosticInfo(appVersion: string): string {
  return [
    "----------------------------------------",
    `App Version: ${appVersion}`,
    `Platform: ${osDescription()}`,
    "----------------------------------------",
  ].join("\n");
}
