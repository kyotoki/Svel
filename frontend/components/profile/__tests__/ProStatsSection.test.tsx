import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

import { Adventure } from "../../../types/adventure";
import ProStatsSection from "../ProStatsSection";

function makeAdventure(
  overrides: Partial<Adventure> & Pick<Adventure, "id" | "date" | "max_depth_meters" | "duration_minutes">
): Adventure {
  return {
    title: "Dive",
    time_of_day: null,
    created_at: `${overrides.date}T12:00:00.000Z`,
    location_name: "Test Site",
    latitude: 1,
    longitude: 2,
    notes: null,
    photos: [],
    water_temp_c: null,
    wave_height_m: null,
    tide_height_m: null,
    activity_type: "scuba",
    tank_pressure_bar: null,
    gas_mix: null,
    species: [],
    ...overrides,
  };
}

test("free users see a locked teaser, not real numbers", () => {
  const adventures = [makeAdventure({ id: 1, date: "2026-01-01", max_depth_meters: 20, duration_minutes: 30 })];
  render(<ProStatsSection adventures={adventures} unitSystem="metric" isPro={false} onRequirePro={jest.fn()} />);

  expect(screen.getByText("Unlock with Svel Pro")).toBeTruthy();
  expect(screen.queryByText("YEAR OVER YEAR")).toBeNull();
});

test("tapping the locked teaser's button calls onRequirePro", () => {
  const onRequirePro = jest.fn();
  render(<ProStatsSection adventures={[]} unitSystem="metric" isPro={false} onRequirePro={onRequirePro} />);

  fireEvent.press(screen.getByText("Unlock with Svel Pro"));
  expect(onRequirePro).toHaveBeenCalled();
});

test("Pro users see the real year-over-year, records, and distribution content", () => {
  const adventures = [
    makeAdventure({ id: 1, date: "2025-03-01", max_depth_meters: 18, duration_minutes: 40 }),
    makeAdventure({ id: 2, date: "2026-01-01", max_depth_meters: 22, duration_minutes: 35 }),
  ];
  render(<ProStatsSection adventures={adventures} unitSystem="metric" isPro onRequirePro={jest.fn()} />);

  expect(screen.queryByText("Unlock with Svel Pro")).toBeNull();
  expect(screen.getByText("YEAR OVER YEAR")).toBeTruthy();
  expect(screen.getByText("2025")).toBeTruthy();
  expect(screen.getByText("2026")).toBeTruthy();
  expect(screen.getByText("PERSONAL RECORD TIMELINE")).toBeTruthy();
  expect(screen.getByText("ADVENTURES BY MONTH")).toBeTruthy();
});

test("Pro users with no adventures see an empty-records message, not a crash", () => {
  render(<ProStatsSection adventures={[]} unitSystem="metric" isPro onRequirePro={jest.fn()} />);
  expect(screen.getByText(/No records yet/)).toBeTruthy();
});
