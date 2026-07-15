import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useProfileData } from "../useProfileData";

const mockUser = { id: "user_1", fullName: "Test User", username: "testuser", imageUrl: null };
const mockSignOut = jest.fn();
jest.mock("@clerk/clerk-expo", () => ({
  useUser: () => ({ user: mockUser }),
  useClerk: () => ({ signOut: mockSignOut }),
}));

jest.mock("@react-navigation/native", () => ({
  // Runs the focus callback once on mount, same effect useFocusEffect has
  // the first time a screen becomes focused.
  useFocusEffect: (callback: () => void) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require("react").useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock("../../contexts/PreferencesContext", () => ({
  usePreferences: () => ({
    unitSystem: "metric",
    mapStyle: "standard",
    setUnitSystem: jest.fn(),
    setMapStyle: jest.fn(),
  }),
}));

const mockAuthedFetch = jest.fn();
jest.mock("../../utils/api", () => ({
  useAuthedFetch: () => mockAuthedFetch,
}));

const mockShowAlert = jest.fn();
jest.mock("../../utils/crossPlatformAlert", () => ({
  showAlert: (...args: unknown[]) => mockShowAlert(...args),
}));

const mockUploadPhoto = jest.fn();
jest.mock("../../utils/uploadPhoto", () => ({
  uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///local/photo.jpg" }],
  }),
}));

// Named with the "mock" prefix so Jest's module factory (which can't close
// over ordinary outer-scope variables) is allowed to reference it - cleared
// in beforeEach below so one test's saveLocalProfile write can't leak into
// the next (it did: without this, "pre-existing local data migrates..."
// seeding a bio for user_1 was still visible several tests later).
const mockSecureStoreBacking = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStoreBacking.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStoreBacking.set(key, value);
    return Promise.resolve();
  }),
}));

const ADVENTURES = [
  {
    id: 1,
    title: "Reef Dive",
    date: "2026-07-01",
    created_at: "2026-07-01T10:00:00Z",
    location_name: "Blue Hole",
    latitude: 1,
    longitude: 2,
    max_depth_meters: 18,
    duration_minutes: 40,
    notes: null,
    photos: [],
    water_temp_c: null,
    wave_height_m: null,
    tide_height_m: null,
    activity_type: "scuba",
    tank_pressure_bar: null,
    gas_mix: null,
  },
];
const SCUBA_STATS = { activity_type: "scuba", total_trips: 5, total_minutes: 200, deepest_meters: 30, average_bottom_time_minutes: 40, favorite_site: "Blue Hole" };
const SNORKEL_STATS = { activity_type: "snorkeling", total_trips: 2, total_minutes: 60, deepest_meters: null, average_bottom_time_minutes: null, favorite_site: null };
const FREEDIVING_STATS = { activity_type: "freediving", total_trips: 3, total_minutes: 45, deepest_meters: 22, average_bottom_time_minutes: 2, favorite_site: "Blue Hole" };

const EMPTY_BACKEND_PROFILE = {
  user_id: "user_1",
  first_name: "Test",
  last_name: "User",
  nickname: null,
  country_code: null,
  photo_url: null,
  bio: null,
  certifications: [] as string[],
  gear: [] as { id: string; name: string; type: string }[],
};

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => data });
}

// Routes mockAuthedFetch calls by URL/method rather than a fixed call
// sequence - the hook now fires the profile fetch and the adventures/stats
// fetch from two independent effects, so their relative order isn't
// something these tests should be coupled to.
function mockFetchRouter(overrides: {
  profile?: unknown;
  put?: (body: Record<string, unknown>) => unknown;
  account?: unknown;
  adventures?: unknown;
  scuba?: unknown;
  snorkeling?: unknown;
  freediving?: unknown;
} = {}) {
  mockAuthedFetch.mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes("/profile/me")) {
      if (init?.method === "PUT") {
        const body = JSON.parse(init.body as string);
        return overrides.put ? Promise.resolve(overrides.put(body)) : jsonResponse({ ...EMPTY_BACKEND_PROFILE, ...body });
      }
      return overrides.profile !== undefined ? Promise.resolve(overrides.profile) : jsonResponse(EMPTY_BACKEND_PROFILE);
    }
    if (url.includes("/account/me")) {
      return overrides.account !== undefined ? Promise.resolve(overrides.account) : jsonResponse(null, 204);
    }
    if (url.endsWith("/adventures/")) {
      return overrides.adventures !== undefined ? Promise.resolve(overrides.adventures) : jsonResponse(ADVENTURES);
    }
    if (url.includes("activity_type=scuba")) {
      return overrides.scuba !== undefined ? Promise.resolve(overrides.scuba) : jsonResponse(SCUBA_STATS);
    }
    if (url.includes("activity_type=snorkeling")) {
      return overrides.snorkeling !== undefined ? Promise.resolve(overrides.snorkeling) : jsonResponse(SNORKEL_STATS);
    }
    if (url.includes("activity_type=freediving")) {
      return overrides.freediving !== undefined ? Promise.resolve(overrides.freediving) : jsonResponse(FREEDIVING_STATS);
    }
    return Promise.reject(new Error(`useProfileData.test.ts: unexpected fetch to ${url}`));
  });
}

beforeEach(() => {
  mockAuthedFetch.mockReset();
  mockSignOut.mockReset();
  mockShowAlert.mockReset();
  mockUploadPhoto.mockReset();
  mockSecureStoreBacking.clear();
});

// Grabs the destructive button from the last showAlert(...) call and invokes
// it directly - mirroring how a real confirmation dialog's tap would fire
// the same onPress, without needing a real native/web Alert to render.
function confirmLastAlert() {
  const buttons = mockShowAlert.mock.calls[mockShowAlert.mock.calls.length - 1][2];
  const destructive = buttons.find((b: { style?: string }) => b.style === "destructive");
  destructive.onPress();
}

describe("viewing stats", () => {
  test("fetches adventures and per-activity stats on focus", async () => {
    mockFetchRouter();

    const { result } = renderHook(() => useProfileData());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.adventures).toEqual(ADVENTURES);
    expect(result.current.scubaStats).toEqual(SCUBA_STATS);
    expect(result.current.snorkelingStats).toEqual(SNORKEL_STATS);
    expect(result.current.freedivingStats).toEqual(FREEDIVING_STATS);
    expect(result.current.error).toBeNull();
  });

  test("surfaces an error and stops loading when a stats request fails", async () => {
    mockFetchRouter({ scuba: { ok: false, status: 500 } });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toContain("500");
  });
});

describe("profile fields are backend-sourced", () => {
  test("an empty backend profile with no local data loads as empty, not an error", async () => {
    mockFetchRouter();
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    expect(result.current.localProfile.bio).toBe("");
    expect(result.current.localProfile.certifications).toEqual([]);
  });

  test("a non-empty backend profile is loaded as the source of truth", async () => {
    mockFetchRouter({
      profile: jsonResponse({
        ...EMPTY_BACKEND_PROFILE,
        bio: "Wreck diving enthusiast",
        certifications: ["PADI Open Water"],
        country_code: "US",
      }),
    });

    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    expect(result.current.localProfile.bio).toBe("Wreck diving enthusiast");
    expect(result.current.localProfile.certifications).toEqual(["PADI Open Water"]);
    expect(result.current.localProfile.homeCountryCode).toBe("US");
  });

  test("updateLocalProfile writes through to the backend, not just local storage", async () => {
    mockFetchRouter();
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    act(() => {
      result.current.updateLocalProfile({ bio: "Wreck diving enthusiast" });
    });

    await waitFor(() => expect(result.current.localProfile.bio).toBe("Wreck diving enthusiast"));

    // Round-trips through the real local storage layer (mocked SecureStore)
    // too, since offline resilience still matters - not backend-or-local,
    // both.
    const SecureStore = require("expo-secure-store");
    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "svel_profile_user_1",
        expect.stringContaining("Wreck diving enthusiast")
      )
    );

    await waitFor(() => {
      const putCall = mockAuthedFetch.mock.calls.find(
        ([url, init]) => url.includes("/profile/me") && init?.method === "PUT"
      );
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall![1].body);
      expect(body.bio).toBe("Wreck diving enthusiast");
    });
  });

  test("toggleCertification adds and then removes a certification, writing through each time", async () => {
    mockFetchRouter();
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    act(() => {
      result.current.toggleCertification("PADI Open Water");
    });
    await waitFor(() =>
      expect(result.current.localProfile.certifications).toContain("PADI Open Water")
    );
    await waitFor(() => {
      const lastPut = mockAuthedFetch.mock.calls
        .filter(([url, init]) => url.includes("/profile/me") && init?.method === "PUT")
        .pop();
      expect(JSON.parse(lastPut![1].body).certifications).toEqual(["PADI Open Water"]);
    });

    act(() => {
      result.current.toggleCertification("PADI Open Water");
    });
    await waitFor(() =>
      expect(result.current.localProfile.certifications).not.toContain("PADI Open Water")
    );
  });

  test("a write-through PUT reuses the backend's existing nickname rather than blanking it", async () => {
    mockFetchRouter({
      profile: jsonResponse({ ...EMPTY_BACKEND_PROFILE, nickname: "Fish" }),
    });
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    act(() => {
      result.current.updateLocalProfile({ bio: "New bio" });
    });

    await waitFor(() => {
      const putCall = mockAuthedFetch.mock.calls.find(
        ([url, init]) => url.includes("/profile/me") && init?.method === "PUT"
      );
      expect(putCall).toBeTruthy();
      expect(JSON.parse(putCall![1].body).nickname).toBe("Fish");
    });
  });

  test("pre-existing local-only data migrates to the backend once, when the backend is empty", async () => {
    // Simulates a device that had bio/certifications from before Month 4b's
    // backend sync existed - profileStorage.ts's cache already has this
    // value; the backend has never seen it.
    const SecureStore = require("expo-secure-store");
    await SecureStore.setItemAsync(
      "svel_profile_user_1",
      JSON.stringify({
        bio: "Pre-existing local bio",
        homeCountryCode: null,
        certifications: [],
        gear: [],
        photoUri: null,
      })
    );

    let putBody: Record<string, unknown> | null = null;
    mockFetchRouter({
      put: (body) => {
        putBody = body;
        return { ok: true, status: 200, json: async () => ({ ...EMPTY_BACKEND_PROFILE, ...body }) };
      },
    });

    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    await waitFor(() => expect(putBody).not.toBeNull());
    expect(putBody!.bio).toBe("Pre-existing local bio");
    expect(result.current.localProfile.bio).toBe("Pre-existing local bio");
  });

  test("handleAvatarPress uploads the picked photo before saving it, not the raw device URI", async () => {
    mockFetchRouter();
    mockUploadPhoto.mockResolvedValue("https://pub-test.r2.dev/user_1/avatar.jpg");

    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isProfileLoaded).toBe(true));

    await act(async () => {
      await result.current.handleAvatarPress();
    });

    expect(mockUploadPhoto).toHaveBeenCalled();
    expect(result.current.localProfile.photoUri).toBe("https://pub-test.r2.dev/user_1/avatar.jpg");
  });
});

describe("deleting an account", () => {
  test("confirming calls DELETE /account/me and signs out on success", async () => {
    mockFetchRouter();
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleDeleteAccount();
    });
    expect(mockShowAlert).toHaveBeenCalledWith(
      "Delete Account",
      expect.stringContaining("cannot be undone"),
      expect.any(Array)
    );

    await act(async () => {
      confirmLastAlert();
    });

    const deleteCall = mockAuthedFetch.mock.calls.find(([url]) => url.includes("/account/me"));
    expect(deleteCall).toBeTruthy();
    expect(deleteCall![1]).toEqual(expect.objectContaining({ method: "DELETE" }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  test("does not sign out if the deletion request fails", async () => {
    mockFetchRouter({ account: { ok: false, status: 502 } });
    const { result } = renderHook(() => useProfileData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleDeleteAccount();
    });
    await act(async () => {
      confirmLastAlert();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    // Once for the initial "are you sure" confirmation, once for the failure.
    expect(mockShowAlert).toHaveBeenCalledWith(
      "Unable to delete account",
      expect.any(String)
    );
  });
});
