import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { enqueueAdventure, getQueue, QueuedAdventurePayload } from "../adventureQueue";
import { REAUTH_MESSAGE } from "../errors";
import { useAdventureSync } from "../useAdventureSync";

const mockAuthedFetch = jest.fn();
jest.mock("../api", () => ({
  useAuthedFetch: () => mockAuthedFetch,
}));

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

beforeEach(async () => {
  await AsyncStorage.clear();
  mockAuthedFetch.mockReset();
  (NetInfo.addEventListener as jest.Mock).mockClear();
});

function emitConnected() {
  const listener = (NetInfo.addEventListener as jest.Mock).mock.calls.at(-1)?.[0];
  act(() => {
    listener?.({ isConnected: true });
  });
}

test("reconnecting syncs a pending item and removes it from the queue", async () => {
  await enqueueAdventure(PAYLOAD, []);
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

  const { result } = renderHook(() => useAdventureSync());
  await waitFor(() => expect(result.current.pendingCount).toBe(1));

  emitConnected();

  await waitFor(() => expect(result.current.pendingCount).toBe(0));
  expect(await getQueue()).toHaveLength(0);
  expect(mockAuthedFetch).toHaveBeenCalledWith(
    expect.stringContaining("/adventures/"),
    expect.objectContaining({ method: "POST" })
  );
});

test("a server rejection marks the item failed instead of retrying forever, storing the real error", async () => {
  await enqueueAdventure(PAYLOAD, []);
  mockAuthedFetch.mockResolvedValue({ ok: false, status: 422 });

  const { result } = renderHook(() => useAdventureSync());
  await waitFor(() => expect(result.current.pendingCount).toBe(1));

  emitConnected();

  await waitFor(() => expect(result.current.failedCount).toBe(1));
  expect(result.current.pendingCount).toBe(0);
  expect(result.current.needsReauth).toBe(false);

  const [queued] = await getQueue();
  expect(queued.status).toBe("failed");
  expect(queued.error).toContain("422");
  expect(queued.requiresReauth).toBe(false);
});

test("a 401 marks the item as requiring re-authentication with a clear message", async () => {
  await enqueueAdventure(PAYLOAD, []);
  mockAuthedFetch.mockResolvedValue({ ok: false, status: 401 });

  const { result } = renderHook(() => useAdventureSync());
  await waitFor(() => expect(result.current.pendingCount).toBe(1));

  emitConnected();

  await waitFor(() => expect(result.current.needsReauth).toBe(true));
  expect(result.current.failedCount).toBe(1);

  const [queued] = await getQueue();
  expect(queued.status).toBe("failed");
  expect(queued.requiresReauth).toBe(true);
  expect(queued.error).toBe(REAUTH_MESSAGE);
});

test("a 403 is also treated as requiring re-authentication", async () => {
  await enqueueAdventure(PAYLOAD, []);
  mockAuthedFetch.mockResolvedValue({ ok: false, status: 403 });

  const { result } = renderHook(() => useAdventureSync());
  await waitFor(() => expect(result.current.pendingCount).toBe(1));

  emitConnected();

  await waitFor(() => expect(result.current.needsReauth).toBe(true));

  const [queued] = await getQueue();
  expect(queued.requiresReauth).toBe(true);
  expect(queued.error).toBe(REAUTH_MESSAGE);
});

test("a network error leaves the item pending for the next reconnect", async () => {
  await enqueueAdventure(PAYLOAD, []);
  mockAuthedFetch.mockRejectedValue(new TypeError("Network request failed"));

  const { result } = renderHook(() => useAdventureSync());
  await waitFor(() => expect(result.current.pendingCount).toBe(1));

  emitConnected();

  await waitFor(() => expect(mockAuthedFetch).toHaveBeenCalledTimes(1));

  const [queued] = await getQueue();
  expect(queued.status).toBe("pending");
});

test("uploads queued photos before posting the adventure", async () => {
  await enqueueAdventure(PAYLOAD, [{ uri: "file:///a.jpg", fileName: "a.jpg", mimeType: "image/jpeg" }]);
  mockAuthedFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://cdn.example/a.jpg" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) });

  const { result } = renderHook(() => useAdventureSync());
  await waitFor(() => expect(result.current.pendingCount).toBe(1));

  emitConnected();

  await waitFor(() => expect(result.current.pendingCount).toBe(0));
  expect(mockAuthedFetch).toHaveBeenCalledTimes(2);
  const [, adventureInit] = mockAuthedFetch.mock.calls[1];
  const body = JSON.parse(adventureInit.body);
  expect(body.photos).toEqual(["https://cdn.example/a.jpg"]);
});
