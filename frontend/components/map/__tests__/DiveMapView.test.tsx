import { render } from "@testing-library/react-native";
import { View } from "react-native";

import { Adventure } from "../../../types/adventure";
import DiveMapView from "../DiveMapView";

// react-native-maps has no meaningful native implementation under plain
// jest - stubbed to plain Views so this test can inspect what DiveMapView
// actually renders (one Marker per adventure) without needing a real map
// runtime. Each Marker keeps a testID derived from its child count so the
// assertions below can count markers without relying on internal React
// tree shape.
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View: RNView } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => <RNView ref={ref} {...props} />),
    Marker: (props: any) => <RNView testID="marker" {...props} />,
    PROVIDER_GOOGLE: "google",
    Region: {},
  };
});

jest.mock("react-native-map-clustering", () => {
  const React = require("react");
  const { View: RNView } = require("react-native");
  return React.forwardRef((props: any, ref: any) => <RNView ref={ref} {...props} />);
});

jest.mock("../../../contexts/PreferencesContext", () => ({
  usePreferences: () => ({ mapStyle: "standard" }),
}));

jest.mock("@expo/vector-icons", () => {
  const { View: RNView } = require("react-native");
  return { Ionicons: RNView };
});

function makeAdventure(id: number, species: string[]): Adventure {
  return {
    id,
    title: `Dive ${id}`,
    date: "2026-07-01",
    created_at: "2026-07-01T12:00:00.000Z",
    location_name: `Site ${id}`,
    latitude: id,
    longitude: id,
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
    species,
    user_id: "user_1",
  } as Adventure;
}

test("renders exactly one pin per adventure, regardless of how many species each one has tagged", () => {
  const adventures = [
    makeAdventure(1, []),
    makeAdventure(2, ["fish-clownfish"]),
    makeAdventure(3, ["fish-clownfish", "sharks_rays-whale-shark", "sharks_rays-tiger-shark"]),
  ];

  const { getAllByTestId } = render(
    <DiveMapView adventures={adventures} onSelectAdventure={() => {}} />
  );

  expect(getAllByTestId("marker")).toHaveLength(adventures.length);
});

test("revisiting the same location multiple times still yields one pin per visit, not per species", () => {
  const adventures = [
    { ...makeAdventure(1, ["fish-clownfish"]), location_name: "Blue Hole" },
    { ...makeAdventure(2, ["sharks_rays-whale-shark", "reptiles-green-sea-turtle"]), location_name: "Blue Hole" },
  ];

  const { getAllByTestId } = render(
    <DiveMapView adventures={adventures} onSelectAdventure={() => {}} />
  );

  expect(getAllByTestId("marker")).toHaveLength(2);
});
