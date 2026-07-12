import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { Adventure } from "../types/adventure";
import { getMostRecentAdventureDate } from "./streaks";

// Native-only (iOS/Android) implementation, defended two ways:
//
// 1. utils/notifications.web.ts is a sibling override (same convention as
//    components/map/DiveMapView.tsx / DiveMapView.web.tsx) that Metro should
//    pick instead of this file when bundling for web - verified with a clean
//    `expo export --platform web`, whose output bundle contains zero trace
//    of this file's code (no reminder text, no notification-scheduler
//    module reference).
// 2. Every function below that touches the Notifications.* API ALSO checks
//    Platform.OS itself, before any such call - not because the file split
//    is wrong, but because a stale Metro bundler cache (e.g. a dev server
//    still running from before notifications.web.ts existed) can otherwise
//    keep serving this file's old resolution to a web client. This is the
//    actual guard that matters at runtime if that ever happens again; the
//    file split is the first line of defense, this is the second.
function isSupportedPlatform(): boolean {
  return Platform.OS !== "web";
}
const UNSUPPORTED_PLATFORM_MESSAGE =
  "utils/notifications.ts was reached on web - Metro should have resolved utils/notifications.web.ts instead. This is almost always a stale bundler cache; restart the dev server with cache cleared (e.g. `expo start --web --clear`).";

// The one reminder this month ships: "you haven't logged an activity in a
// while." Entirely local (expo-notifications' on-device scheduler) - no
// Expo push token/production push credentials wired up yet. Real push
// (server-triggered, cross-device) is deferred to Month 4 per this month's
// scope; this only needs the device it's running on.
const STREAK_REMINDER_IDENTIFIER = "svel-streak-reminder";
const STREAK_REMINDER_LAPSE_DAYS = 14;

let handlerConfigured = false;

function configureNotificationHandler() {
  if (handlerConfigured) {
    return;
  }
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isSupportedPlatform()) {
    if (__DEV__) {
      console.warn(UNSUPPORTED_PLATFORM_MESSAGE);
    }
    return false;
  }
  configureNotificationHandler();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }
  if (!existing.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function buildReminderContent(daysSinceLastLog: number) {
  return {
    title: "The ocean's calling",
    body: `It's been ${daysSinceLastLog}+ days since your last logged adventure - ready to get back in the water?`,
  };
}

async function scheduleReminderFor(targetDate: Date): Promise<void> {
  if (!isSupportedPlatform()) {
    if (__DEV__) {
      console.warn(UNSUPPORTED_PLATFORM_MESSAGE);
    }
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_IDENTIFIER).catch(() => {});
  // A target already in the past is clamped a few seconds into the future
  // rather than trusted as-is - relying on undocumented "fires immediately"
  // semantics for a past date is more fragile than just picking a definite
  // near-future moment ourselves.
  const now = Date.now();
  const fireDate = targetDate.getTime() > now ? targetDate : new Date(now + 5_000);
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_IDENTIFIER,
    content: buildReminderContent(STREAK_REMINDER_LAPSE_DAYS),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
}

// The source-of-truth sync: re-anchors the reminder to the user's true most
// recent adventure date across their *entire* logged history, then requests
// permission (only if there's something to remind about - no point prompting
// a brand new account that hasn't logged anything). Meant to be called on
// every app open (see the Map tab's focus effect, since Map is the home tab)
// - idempotent and safe to call repeatedly, since it always resolves to the
// same target date until a newer adventure is logged.
//
// Deliberately NOT reset by merely opening the app without logging anything
// - the countdown is anchored to real activity dates, not to app-open time,
// otherwise a lapsed user who just browses the map would keep pushing their
// own reminder back and never actually receive it.
export async function syncStreakReminder(adventures: Adventure[]): Promise<void> {
  if (!isSupportedPlatform()) {
    if (__DEV__) {
      console.warn(UNSUPPORTED_PLATFORM_MESSAGE);
    }
    return;
  }

  const mostRecentDate = getMostRecentAdventureDate(adventures);
  if (!mostRecentDate) {
    await cancelStreakReminder();
    return;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    return;
  }

  const [year, month, day] = mostRecentDate.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day + STREAK_REMINDER_LAPSE_DAYS);
  await scheduleReminderFor(targetDate);
}

// A lighter-weight re-anchor called right after a single successful log
// submission, where only that one adventure's date is known (not the user's
// full history). Only ever pushes the reminder *further out* - if the
// computed target isn't in the future, this silently does nothing rather
// than risk firing a false "you haven't logged anything" reminder seconds
// after the user just logged something (which the immediate-clamp behavior
// in scheduleReminderFor would otherwise do for a backfilled past-dated
// entry that isn't really their most recent activity). The next full sync
// (next app open) reconciles against the complete history regardless.
export async function extendStreakReminderFromLog(loggedDate: string): Promise<void> {
  if (!isSupportedPlatform()) {
    if (__DEV__) {
      console.warn(UNSUPPORTED_PLATFORM_MESSAGE);
    }
    return;
  }

  const [year, month, day] = loggedDate.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day + STREAK_REMINDER_LAPSE_DAYS);
  if (targetDate.getTime() <= Date.now()) {
    return;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    return;
  }
  await scheduleReminderFor(targetDate);
}

export async function cancelStreakReminder(): Promise<void> {
  if (!isSupportedPlatform()) {
    if (__DEV__) {
      console.warn(UNSUPPORTED_PLATFORM_MESSAGE);
    }
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_IDENTIFIER).catch(() => {});
}
