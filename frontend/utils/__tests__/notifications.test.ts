import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { Adventure } from "../../types/adventure";
import {
  cancelStreakReminder,
  extendStreakReminderFromLog,
  requestNotificationPermissions,
  syncStreakReminder,
} from "../notifications";

// Regression coverage for a real bug: utils/notifications.ts was reached on
// web (via a stale Metro bundler cache serving the old resolution before
// utils/notifications.web.ts existed) and crashed calling
// Notifications.scheduleNotificationAsync, which isn't implemented on web.
// The file split is the primary fix, but these tests exercise the second
// line of defense directly - every exported function's own Platform.OS
// check - by forcing Platform.OS to "web" and asserting no Notifications.*
// API is ever called, regardless of which file Metro happened to resolve.
function makeAdventure(id: number, date: string): Adventure {
  return {
    id,
    title: "Dive",
    date,
    created_at: `${date}T12:00:00.000Z`,
    location_name: "Test Site",
    latitude: 1,
    longitude: 2,
    max_depth_meters: 10,
    duration_minutes: 30,
    notes: null,
    photos: [],
    water_temp_c: null,
    wave_height_m: null,
    tide_height_m: null,
    activity_type: "scuba",
    tank_pressure_bar: null,
    gas_mix: null,
    species: [],
  };
}

const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "web";
});

afterEach(() => {
  Platform.OS = originalOS;
});

test("requestNotificationPermissions never calls the Notifications API on web", async () => {
  const granted = await requestNotificationPermissions();

  expect(granted).toBe(false);
  expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
});

test("syncStreakReminder never calls scheduleNotificationAsync on web, even with real adventures", async () => {
  const adventures = [makeAdventure(1, "2026-07-01")];

  await expect(syncStreakReminder(adventures)).resolves.toBeUndefined();

  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
});

test("extendStreakReminderFromLog never calls scheduleNotificationAsync on web", async () => {
  await expect(extendStreakReminderFromLog("2026-07-01")).resolves.toBeUndefined();

  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test("cancelStreakReminder never calls cancelScheduledNotificationAsync on web", async () => {
  await expect(cancelStreakReminder()).resolves.toBeUndefined();

  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
});

describe("on native (iOS), behavior is unchanged", () => {
  beforeEach(() => {
    Platform.OS = "ios";
  });

  test("requestNotificationPermissions still calls through to the real API", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: true });

    const granted = await requestNotificationPermissions();

    expect(granted).toBe(true);
    expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test("syncStreakReminder still schedules a reminder", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
      canAskAgain: true,
    });

    await syncStreakReminder([makeAdventure(1, "2026-07-01")]);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
