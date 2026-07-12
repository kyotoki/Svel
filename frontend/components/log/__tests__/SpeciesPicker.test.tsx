import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ getToken: jest.fn().mockResolvedValue("test-token") }),
}));

import SpeciesPicker from "../SpeciesPicker";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

function openPicker() {
  fireEvent.press(screen.getByRole("button", { name: /species spotted/i }));
}

test("does not fetch nearby species when no coordinates are entered yet", () => {
  render(<SpeciesPicker selectedIds={[]} onToggle={jest.fn()} latitude={null} longitude={null} activityType="scuba" />);

  openPicker();

  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.queryByText(/Suggested Near You/i)).toBeNull();
});

test("shows a Suggested Near You section built from matched nearby species once coordinates are available", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      {
        gbif_species_key: 2417522,
        scientific_name: "Rhincodon typus",
        vernacular_name: "Whale Shark",
        occurrence_count: 500,
        taxon_class: "Elasmobranchii",
      },
    ],
  });

  render(
    <SpeciesPicker selectedIds={[]} onToggle={jest.fn()} latitude={25.1} longitude={-80.2} activityType="scuba" />
  );

  openPicker();

  await waitFor(() => expect(screen.getByText(/Suggested Near You/i)).toBeTruthy());
  expect(screen.getByText("Whale Shark")).toBeTruthy();

  const [calledUrl] = mockFetch.mock.calls[0];
  expect(calledUrl).toContain("latitude=25.1");
  expect(calledUrl).toContain("longitude=-80.2");
});

test("falls back to no suggestions (not an error) when the nearby-species request fails", async () => {
  mockFetch.mockRejectedValue(new TypeError("Network request failed"));

  render(
    <SpeciesPicker selectedIds={[]} onToggle={jest.fn()} latitude={25.1} longitude={-80.2} activityType="scuba" />
  );

  openPicker();

  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  expect(screen.queryByText(/Suggested Near You/i)).toBeNull();
  // The rest of the picker is unaffected - the full curated list is still there.
  expect(screen.getByText(/Fish/)).toBeTruthy();
});

test("selecting a species from Suggested Near You calls onToggle with its id", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      {
        gbif_species_key: 2417522,
        scientific_name: "Rhincodon typus",
        vernacular_name: "Whale Shark",
        occurrence_count: 500,
        taxon_class: "Elasmobranchii",
      },
    ],
  });
  const onToggle = jest.fn();

  render(
    <SpeciesPicker selectedIds={[]} onToggle={onToggle} latitude={25.1} longitude={-80.2} activityType="scuba" />
  );

  openPicker();
  await waitFor(() => expect(screen.getByText("Whale Shark")).toBeTruthy());

  fireEvent.press(screen.getByRole("checkbox", { name: "Whale Shark" }));
  expect(onToggle).toHaveBeenCalledWith("sharks_rays-whale-shark");
});

test("a nearby species not in the curated list still shows up and is selectable", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      {
        gbif_species_key: 999,
        scientific_name: "Epinephelus striatus",
        vernacular_name: "Nassau Grouper",
        occurrence_count: 80,
        taxon_class: "Actinopterygii",
      },
    ],
  });
  const onToggle = jest.fn();

  render(
    <SpeciesPicker selectedIds={[]} onToggle={onToggle} latitude={25.1} longitude={-80.2} activityType="scuba" />
  );

  openPicker();
  await waitFor(() => expect(screen.getByText("Nassau Grouper")).toBeTruthy());

  fireEvent.press(screen.getByRole("checkbox", { name: "Nassau Grouper" }));
  expect(onToggle).toHaveBeenCalledWith("gbif-999");
});

test("shows the emoji/name preview once an ad-hoc species is selected, not just curated ones", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      {
        gbif_species_key: 999,
        scientific_name: "Epinephelus striatus",
        vernacular_name: "Nassau Grouper",
        occurrence_count: 80,
        taxon_class: "Actinopterygii",
      },
    ],
  });

  // Mirrors how useAdventureForm actually drives this: selectedIds is the
  // parent's own state, updated by calling onToggle back.
  function Wrapper() {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    return (
      <SpeciesPicker
        selectedIds={selectedIds}
        onToggle={(id: string) =>
          setSelectedIds((prev: string[]) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        latitude={25.1}
        longitude={-80.2}
        activityType="scuba"
      />
    );
  }

  render(<Wrapper />);
  openPicker();
  await waitFor(() => expect(screen.getByText("Nassau Grouper")).toBeTruthy());

  fireEvent.press(screen.getByRole("checkbox", { name: "Nassau Grouper" }));

  await waitFor(() => expect(screen.getByText(/1 species tagged/)).toBeTruthy());
});
