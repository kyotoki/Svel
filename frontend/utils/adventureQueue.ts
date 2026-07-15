import AsyncStorage from "@react-native-async-storage/async-storage";

import { ActivityType } from "../types/adventure";
import { QueueFullError } from "./errors";

// KNOWN, ACCEPTED RISK: this queue is stored unencrypted (AsyncStorage is
// plain key-value storage, no OS-level encryption) - unlike utils/tokenCache.ts
// and utils/deviceStorage.ts, which use expo-secure-store (iOS Keychain/
// Android Keystore) for the same kind of on-device persistence. That's not
// an oversight here: expo-secure-store has a hard 2048-byte limit per value
// (see node_modules/expo-secure-store/src/byteCounter.ts), and writeQueue()
// below stores the *entire* queue (up to MAX_QUEUE_SIZE items, each with
// free-text notes and photo URIs) as one JSON blob that routinely exceeds
// that - a naive swap to SecureStore would silently start throwing on
// write, trading "unencrypted" for "broken," which is worse. A real fix
// needs either per-item SecureStore entries with enforced size limits, or
// envelope encryption (a small AES key held in SecureStore, encrypting this
// blob before it reaches AsyncStorage) - real new crypto plumbing, flagged
// here as a deliberate follow-up rather than done as a rushed inline patch.
// Exposure is limited to a compromised/rooted device reading this app's own
// sandboxed storage; the data at risk is dive logs (location, date, notes),
// not credentials.

// A worst-case multi-day offline trip logging a dozen-plus dives a day is
// still nowhere near this - it exists purely to stop the queue from growing
// unbounded (with no age-based eviction) if something keeps items from ever
// syncing. Counts every item regardless of status (pending or failed).
export const MAX_QUEUE_SIZE = 150;

// The exact POST /adventures/ body shape, minus `photos` - queued photos are
// tracked separately (see QueuedPhoto) since they need to be uploaded first
// to get real URLs, which can only happen once connectivity is back.
export interface QueuedAdventurePayload {
  title: string;
  date: string;
  time_of_day: string | null;
  location_name: string;
  latitude: number;
  longitude: number;
  max_depth_meters: number;
  duration_minutes: number;
  notes: string | null;
  activity_type: ActivityType;
  tank_pressure_bar: number | null;
  gas_mix: string | null;
  species: string[];
}

// A structural subset of ImagePicker.ImagePickerAsset that survives
// JSON.stringify - just enough for uploadPhoto() to re-upload it later.
export interface QueuedPhoto {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
}

export type QueuedAdventureStatus = "pending" | "failed";

export interface QueuedAdventure {
  localId: string;
  payload: QueuedAdventurePayload;
  photos: QueuedPhoto[];
  status: QueuedAdventureStatus;
  error?: string;
  // True when `error` failed with a 401/403 - the item won't sync no matter
  // how many times it's retried until the user signs in again, which is a
  // distinct situation from any other server rejection.
  requiresReauth?: boolean;
  queuedAt: string;
}

const STORAGE_KEY = "svel_adventure_sync_queue";

async function readQueue(): Promise<QueuedAdventure[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as QueuedAdventure[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAdventure[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAdventure[]> {
  return readQueue();
}

export async function enqueueAdventure(
  payload: QueuedAdventurePayload,
  photos: QueuedPhoto[]
): Promise<QueuedAdventure> {
  const queue = await readQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    throw new QueueFullError(
      `The offline sync queue is full (${MAX_QUEUE_SIZE} adventures). Reconnect to sync pending items before logging more offline.`
    );
  }
  const item: QueuedAdventure = {
    // Timestamp + random suffix rather than a counter - two dives queued in
    // the same millisecond (offline, by hand) is implausible, but this
    // avoids needing a separately-persisted counter to stay collision-free
    // across app restarts.
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    photos,
    status: "pending",
    queuedAt: new Date().toISOString(),
  };
  await writeQueue([...queue, item]);
  return item;
}

export async function removeFromQueue(localId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.localId !== localId));
}

// A "failed" item reached the server and was rejected (validation, auth,
// etc.) - retrying it unchanged would just fail the same way again, so it's
// set aside instead of being retried on every reconnect.
export async function markQueueItemFailed(
  localId: string,
  error: string,
  options?: { requiresReauth?: boolean }
): Promise<void> {
  const queue = await readQueue();
  await writeQueue(
    queue.map((item) =>
      item.localId === localId
        ? { ...item, status: "failed", error, requiresReauth: options?.requiresReauth ?? false }
        : item
    )
  );
}

export async function discardQueueItem(localId: string): Promise<void> {
  await removeFromQueue(localId);
}
