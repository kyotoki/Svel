import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

jest.mock("@clerk/clerk-expo", () => ({
  useUser: () => ({
    user: {
      firstName: "Ada",
      lastName: "Lovelace",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
      update: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));

import { DEFAULT_LOCAL_PROFILE } from "../../../utils/profileStorage";
import EditProfileModal from "../EditProfileModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof EditProfileModal>> = {}) {
  return render(
    <EditProfileModal
      visible
      onClose={jest.fn()}
      profile={DEFAULT_LOCAL_PROFILE}
      onUpdateProfile={jest.fn()}
      gearSubtext="2 items tracked"
      onManageGear={jest.fn()}
      unitSystem="metric"
      onUnitSystemChange={jest.fn()}
      mapStyleLabel="Standard"
      onMapPreferences={jest.fn()}
      onPrivacyControls={jest.fn()}
      {...overrides}
    />
  );
}

test("shows Manage Equipment, Unit Measurements, Map Preferences, and Privacy Controls nested inside the Account modal", () => {
  renderModal();

  expect(screen.getByText("Manage Equipment")).toBeTruthy();
  expect(screen.getByText("2 items tracked")).toBeTruthy();
  expect(screen.getByText("Unit Measurements")).toBeTruthy();
  expect(screen.getByText("Map Preferences")).toBeTruthy();
  expect(screen.getByText("Standard")).toBeTruthy();
  expect(screen.getByText("Privacy Controls")).toBeTruthy();
});

test("tapping Manage Equipment calls onManageGear", () => {
  const onManageGear = jest.fn();
  renderModal({ onManageGear });
  fireEvent.press(screen.getByText("Manage Equipment"));
  expect(onManageGear).toHaveBeenCalled();
});

test("tapping Map Preferences calls onMapPreferences", () => {
  const onMapPreferences = jest.fn();
  renderModal({ onMapPreferences });
  fireEvent.press(screen.getByText("Map Preferences"));
  expect(onMapPreferences).toHaveBeenCalled();
});

test("tapping Privacy Controls calls onPrivacyControls", () => {
  const onPrivacyControls = jest.fn();
  renderModal({ onPrivacyControls });
  fireEvent.press(screen.getByText("Privacy Controls"));
  expect(onPrivacyControls).toHaveBeenCalled();
});

test("the last name field has no minimum width, so a long value shrinks to fit instead of overflowing the card", () => {
  renderModal();

  const lastNameInput = screen.getByPlaceholderText("Last name");
  const flatStyle = Array.isArray(lastNameInput.props.style)
    ? Object.assign({}, ...lastNameInput.props.style)
    : lastNameInput.props.style;

  expect(flatStyle.flex).toBe(1);
  expect(flatStyle.minWidth).toBe(0);
});
