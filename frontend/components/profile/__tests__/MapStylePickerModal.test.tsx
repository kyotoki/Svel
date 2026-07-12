import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

import MapStylePickerModal from "../MapStylePickerModal";

test("free users can select Standard normally", () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  render(
    <MapStylePickerModal
      visible
      onClose={onClose}
      value="standard"
      onSelect={onSelect}
      isPro={false}
      onRequirePro={jest.fn()}
    />
  );

  fireEvent.press(screen.getByLabelText("Standard"));
  expect(onSelect).toHaveBeenCalledWith("standard");
  expect(onClose).toHaveBeenCalled();
});

test("free users tapping Satellite triggers the Pro paywall instead of selecting it", () => {
  const onSelect = jest.fn();
  const onRequirePro = jest.fn();
  render(
    <MapStylePickerModal
      visible
      onClose={jest.fn()}
      value="standard"
      onSelect={onSelect}
      isPro={false}
      onRequirePro={onRequirePro}
    />
  );

  fireEvent.press(screen.getByLabelText(/Satellite/));
  expect(onSelect).not.toHaveBeenCalled();
  expect(onRequirePro).toHaveBeenCalled();
});

test("free users tapping Hybrid also triggers the Pro paywall", () => {
  const onSelect = jest.fn();
  const onRequirePro = jest.fn();
  render(
    <MapStylePickerModal
      visible
      onClose={jest.fn()}
      value="standard"
      onSelect={onSelect}
      isPro={false}
      onRequirePro={onRequirePro}
    />
  );

  fireEvent.press(screen.getByLabelText(/Hybrid/));
  expect(onSelect).not.toHaveBeenCalled();
  expect(onRequirePro).toHaveBeenCalled();
});

test("Pro users can select Satellite and Hybrid normally, no paywall", () => {
  const onSelect = jest.fn();
  const onRequirePro = jest.fn();
  render(
    <MapStylePickerModal
      visible
      onClose={jest.fn()}
      value="standard"
      onSelect={onSelect}
      isPro
      onRequirePro={onRequirePro}
    />
  );

  fireEvent.press(screen.getByLabelText("Satellite"));
  expect(onSelect).toHaveBeenCalledWith("satellite");
  expect(onRequirePro).not.toHaveBeenCalled();
});

test("locked options show a PRO badge, unlocked ones don't", () => {
  render(
    <MapStylePickerModal
      visible
      onClose={jest.fn()}
      value="standard"
      onSelect={jest.fn()}
      isPro={false}
      onRequirePro={jest.fn()}
    />
  );

  expect(screen.getAllByText("PRO")).toHaveLength(2); // Satellite + Hybrid, not Standard
});

test("no PRO badges shown at all once the user is Pro", () => {
  render(
    <MapStylePickerModal
      visible
      onClose={jest.fn()}
      value="standard"
      onSelect={jest.fn()}
      isPro
      onRequirePro={jest.fn()}
    />
  );

  expect(screen.queryByText("PRO")).toBeNull();
});
