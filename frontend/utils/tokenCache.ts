import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { TokenCache } from "@clerk/clerk-expo";

// expo-secure-store's web module is an empty stub (no getItemAsync/
// setItemAsync/deleteItemAsync at all), so every call below throws on web -
// same class of bug as useWarmUpBrowser.ts/utils/notifications.ts. Clerk's
// web SDK persists its own session via cookies and doesn't need this cache,
// so it's a genuine no-op on web, not just an unnecessary one.
function isSupportedPlatform(): boolean {
  return Platform.OS !== "web";
}

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    if (!isSupportedPlatform()) {
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Best-effort cleanup of a corrupt entry; a failed delete just leaves it in place.
      }
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    if (!isSupportedPlatform()) {
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Persisting the token is best-effort; a failed write just forces a re-login.
    }
  },
};
