import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  discardQueueItem,
  enqueueAdventure,
  getQueue,
  markQueueItemFailed,
  MAX_QUEUE_SIZE,
  QueuedAdventurePayload,
  removeFromQueue,
} from "../adventureQueue";
import { QueueFullError } from "../errors";

beforeEach(async () => {
  await AsyncStorage.clear();
});

const PAYLOAD: QueuedAdventurePayload = {
  title: "Reef Dive",
  date: "2026-07-01",
  location_name: "Blue Hole",
  latitude: 1,
  longitude: 2,
  max_depth_meters: 18,
  duration_minutes: 40,
  notes: null,
  activity_type: "scuba",
  tank_pressure_bar: null,
  gas_mix: null,
  species: [],
};

test("enqueueAdventure persists a pending item retrievable via getQueue", async () => {
  const item = await enqueueAdventure(PAYLOAD, []);

  expect(item.status).toBe("pending");
  expect(item.payload).toEqual(PAYLOAD);

  const queue = await getQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0].localId).toBe(item.localId);
});

test("enqueueAdventure assigns each item a distinct localId", async () => {
  const first = await enqueueAdventure(PAYLOAD, []);
  const second = await enqueueAdventure(PAYLOAD, []);

  expect(first.localId).not.toBe(second.localId);
  expect(await getQueue()).toHaveLength(2);
});

test("removeFromQueue removes only the matching item", async () => {
  const first = await enqueueAdventure(PAYLOAD, []);
  const second = await enqueueAdventure({ ...PAYLOAD, title: "Second Dive" }, []);

  await removeFromQueue(first.localId);

  const queue = await getQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0].localId).toBe(second.localId);
});

test("markQueueItemFailed flips status without removing the item", async () => {
  const item = await enqueueAdventure(PAYLOAD, []);

  await markQueueItemFailed(item.localId, "The server rejected this adventure.");

  const [queued] = await getQueue();
  expect(queued.status).toBe("failed");
  expect(queued.error).toBe("The server rejected this adventure.");
});

test("discardQueueItem removes a failed item entirely", async () => {
  const item = await enqueueAdventure(PAYLOAD, []);
  await markQueueItemFailed(item.localId, "rejected");

  await discardQueueItem(item.localId);

  expect(await getQueue()).toHaveLength(0);
});

test("photos are stored alongside the payload", async () => {
  const photos = [{ uri: "file:///photo.jpg", fileName: "photo.jpg", mimeType: "image/jpeg" }];
  const item = await enqueueAdventure(PAYLOAD, photos);

  expect(item.photos).toEqual(photos);
});

test("enqueueAdventure accepts items up to MAX_QUEUE_SIZE", async () => {
  for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
    await enqueueAdventure(PAYLOAD, []);
  }

  expect(await getQueue()).toHaveLength(MAX_QUEUE_SIZE);
});

test("enqueueAdventure throws QueueFullError once the queue is at MAX_QUEUE_SIZE, without adding the item", async () => {
  for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
    await enqueueAdventure(PAYLOAD, []);
  }

  await expect(enqueueAdventure(PAYLOAD, [])).rejects.toBeInstanceOf(QueueFullError);
  expect(await getQueue()).toHaveLength(MAX_QUEUE_SIZE);
});

test("enqueueAdventure counts failed items toward the cap, not just pending ones", async () => {
  for (let i = 0; i < MAX_QUEUE_SIZE - 1; i++) {
    await enqueueAdventure(PAYLOAD, []);
  }
  const last = await enqueueAdventure(PAYLOAD, []);
  await markQueueItemFailed(last.localId, "rejected");

  await expect(enqueueAdventure(PAYLOAD, [])).rejects.toBeInstanceOf(QueueFullError);
});

test("removing an item frees up room in a full queue", async () => {
  const items = [];
  for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
    items.push(await enqueueAdventure(PAYLOAD, []));
  }

  await removeFromQueue(items[0].localId);

  await expect(enqueueAdventure(PAYLOAD, [])).resolves.toBeTruthy();
  expect(await getQueue()).toHaveLength(MAX_QUEUE_SIZE);
});
