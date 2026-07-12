import { Platform } from "react-native";

const API_PORT = 8000;

// Android emulators can't reach the host machine via "localhost" - they route
// host-loopback traffic through the special alias 10.0.2.2 instead. Web and
// iOS simulators share the host's network namespace, so localhost works fine.
const getBaseUrl = (): string => {
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
};

// EXPO_PUBLIC_API_URL lets this point at a real deployment later (Month 4)
// with no code change - only the env value changes.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getBaseUrl();

export const ENDPOINTS = {
  // Trailing slash matters here: the backend route is registered as "/" under
  // the "/adventures" router prefix, so without it every request silently
  // round-trips through a 307 redirect (FastAPI's default redirect_slashes)
  // before reaching the real endpoint.
  adventures: `${API_BASE_URL}/adventures/`,
  adventure: (id: number) => `${API_BASE_URL}/adventures/${id}`,
  uploads: `${API_BASE_URL}/uploads/`,
  stats: `${API_BASE_URL}/stats/`,
  statsByActivity: (activityType: string) =>
    `${API_BASE_URL}/stats/by-activity?activity_type=${activityType}`,
  profile: `${API_BASE_URL}/profile/me`,
  speciesNearby: (latitude: number, longitude: number, marineOnly: boolean) =>
    `${API_BASE_URL}/species/nearby?latitude=${latitude}&longitude=${longitude}&marine_only=${marineOnly}`,
};
