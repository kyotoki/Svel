import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { act, renderHook } from "@testing-library/react-native";

import { enqueueAdventure, getQueue, MAX_QUEUE_SIZE, QueuedAdventurePayload } from "../../utils/adventureQueue";
import { showAlert } from "../../utils/crossPlatformAlert";
import { useAdventureForm } from "../useAdventureForm";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
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

jest.mock("../../utils/crossPlatformAlert", () => ({
  showAlert: jest.fn(),
}));

// useAdventureForm reads the signed-in user's id (for the first-adventure/
// first-photo analytics milestones) - imported here directly rather than
// pulling in the real @clerk/clerk-expo client, which opens a MessagePort
// that keeps the whole jest process alive past the test run.
jest.mock("@clerk/clerk-expo", () => ({
  useUser: () => ({ user: { id: "user_1" } }),
}));

function fillValidForm(form: ReturnType<typeof useAdventureForm>) {
  act(() => {
    form.updateField("title", "Reef Dive");
    form.updateField("location_name", "Blue Hole");
    form.updateField("latitude", "1");
    form.updateField("longitude", "2");
    form.updateField("max_depth_meters", "18");
    form.updateField("duration_minutes", "40");
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockAuthedFetch.mockReset();
  mockPush.mockReset();
  (showAlert as jest.Mock).mockReset();
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
});

test("does not submit when required fields are missing", async () => {
  const { result } = renderHook(() => useAdventureForm());

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(mockAuthedFetch).not.toHaveBeenCalled();
  expect(result.current.errors.title).toBeTruthy();
  expect(result.current.errors.location_name).toBeTruthy();
});

test("logs an adventure successfully when online", async () => {
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(mockAuthedFetch).toHaveBeenCalledTimes(1);
  const [endpoint, init] = mockAuthedFetch.mock.calls[0];
  expect(endpoint).toContain("/adventures/");
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({
    title: "Reef Dive",
    location_name: "Blue Hole",
    latitude: 1,
    longitude: 2,
    max_depth_meters: 18,
    duration_minutes: 40,
    activity_type: "scuba",
  });

  // Form resets back to blank after a successful submit.
  expect(result.current.form.title).toBe("");
  expect(showAlert).toHaveBeenCalledWith(
    "Adventure logged",
    expect.any(String),
    expect.any(Array)
  );
  expect(await getQueue()).toHaveLength(0);
});

test("logs a freediving adventure, keeping depth but nulling scuba-only fields", async () => {
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

  const { result } = renderHook(() => useAdventureForm());

  act(() => {
    result.current.handleActivityTypeChange("freediving");
  });
  // Freediving tracks depth (like scuba) but has no tank/gas gear.
  expect(result.current.tracksDepth).toBe(true);
  expect(result.current.isScuba).toBe(false);

  fillValidForm(result.current);
  // Even if tank pressure was left over in form state (e.g. from switching
  // away from scuba without clearing it), the submitted payload must still
  // null it out for a non-scuba activity type.
  act(() => {
    result.current.updateField("tank_pressure_bar", "200");
  });

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(mockAuthedFetch).toHaveBeenCalledTimes(1);
  const [, init] = mockAuthedFetch.mock.calls[0];
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({
    activity_type: "freediving",
    max_depth_meters: 18,
    tank_pressure_bar: null,
    gas_mix: null,
  });
  expect(showAlert).toHaveBeenCalledWith("Adventure logged", expect.any(String), expect.any(Array));
});

test("queues the adventure locally when the device is offline", async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(mockAuthedFetch).not.toHaveBeenCalled();

  const queue = await getQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0].payload).toMatchObject({ title: "Reef Dive", location_name: "Blue Hole" });
  expect(queue[0].status).toBe("pending");

  // Form resets, same as a successful online submit.
  expect(result.current.form.title).toBe("");
  expect(showAlert).toHaveBeenCalledWith(
    "Saved offline",
    expect.stringContaining("will sync automatically"),
    expect.any(Array)
  );
});

test("queues the adventure when the request fails for a connectivity reason", async () => {
  // NetInfo said we were online, but the actual request still couldn't
  // complete - treated the same as a known-offline submission.
  mockAuthedFetch.mockRejectedValue(new TypeError("Network request failed"));

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(await getQueue()).toHaveLength(1);
  expect(showAlert).toHaveBeenCalledWith(
    "Saved offline",
    expect.stringContaining("will sync automatically"),
    expect.any(Array)
  );
});

test("shows a clear message and leaves the form filled when the offline queue is full", async () => {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

  const filler: QueuedAdventurePayload = {
    title: "Filler",
    date: "2026-07-01",
    location_name: "Somewhere",
    latitude: 0,
    longitude: 0,
    max_depth_meters: 10,
    duration_minutes: 20,
    notes: null,
    activity_type: "scuba",
    tank_pressure_bar: null,
    gas_mix: null,
    species: [],
  };
  for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
    await enqueueAdventure(filler, []);
  }

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  // Not added - the queue stays exactly at the cap, not the cap + 1.
  expect(await getQueue()).toHaveLength(MAX_QUEUE_SIZE);
  expect(showAlert).toHaveBeenCalledWith("Sync queue full", expect.stringContaining("full"));
  // Form is left filled so the user doesn't lose what they typed.
  expect(result.current.form.title).toBe("Reef Dive");
});

test("shows a real error and does not queue when the server rejects the request", async () => {
  mockAuthedFetch.mockResolvedValue({ ok: false, status: 422 });

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(await getQueue()).toHaveLength(0);
  expect(showAlert).toHaveBeenCalledWith(
    "Unable to save adventure",
    expect.stringContaining("422")
  );
  // Form is left filled so the user can retry, not silently cleared.
  expect(result.current.form.title).toBe("Reef Dive");
});

test("shows a sign-in-required message (not a generic error) when the token is rejected", async () => {
  mockAuthedFetch.mockResolvedValue({ ok: false, status: 401 });

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(await getQueue()).toHaveLength(0);
  expect(showAlert).toHaveBeenCalledWith("Sign-in required", expect.stringContaining("sign"));
  expect(showAlert).not.toHaveBeenCalledWith("Unable to save adventure", expect.anything());
  // Not queued offline either - retrying later won't help until re-authenticated.
  expect(result.current.form.title).toBe("Reef Dive");
});

test("shows a sign-in-required message when a 403 is returned", async () => {
  mockAuthedFetch.mockResolvedValue({ ok: false, status: 403 });

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);

  await act(async () => {
    await result.current.handleSubmit();
  });

  expect(await getQueue()).toHaveLength(0);
  expect(showAlert).toHaveBeenCalledWith("Sign-in required", expect.stringContaining("sign"));
});

test("toggling multiple species accumulates them into one list, not a single value", () => {
  const { result } = renderHook(() => useAdventureForm());

  act(() => {
    result.current.toggleSpecies("fish-clownfish");
  });
  act(() => {
    result.current.toggleSpecies("sharks_rays-whale-shark");
  });
  act(() => {
    result.current.toggleSpecies("reptiles-green-sea-turtle");
  });

  expect(result.current.speciesIds).toEqual([
    "fish-clownfish",
    "sharks_rays-whale-shark",
    "reptiles-green-sea-turtle",
  ]);

  // Toggling an already-selected id removes just that one, same as
  // unchecking a checkbox - the picker's toggle semantics, not a single-select.
  act(() => {
    result.current.toggleSpecies("sharks_rays-whale-shark");
  });
  expect(result.current.speciesIds).toEqual(["fish-clownfish", "reptiles-green-sea-turtle"]);
});

test("submits every tagged species on one adventure, not just the last one selected", async () => {
  mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

  const { result } = renderHook(() => useAdventureForm());
  fillValidForm(result.current);
  act(() => {
    result.current.toggleSpecies("fish-clownfish");
    result.current.toggleSpecies("sharks_rays-whale-shark");
    result.current.toggleSpecies("reptiles-green-sea-turtle");
  });

  await act(async () => {
    await result.current.handleSubmit();
  });

  const [, init] = mockAuthedFetch.mock.calls[0];
  const body = JSON.parse(init.body);
  expect(body.species).toEqual([
    "fish-clownfish",
    "sharks_rays-whale-shark",
    "reptiles-green-sea-turtle",
  ]);
});
