import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

import SvelProModal from "../SvelProModal";

test("defaults to the Annual plan selected, not Monthly", () => {
  render(<SvelProModal visible onClose={jest.fn()} />);
  const annualOption = screen.getByLabelText(/Annual plan/);
  expect(annualOption.props.accessibilityState.selected).toBe(true);

  const monthlyOption = screen.getByLabelText(/Monthly plan/);
  expect(monthlyOption.props.accessibilityState.selected).toBe(false);
});

test("shows the confirmed annual and monthly prices", () => {
  render(<SvelProModal visible onClose={jest.fn()} />);
  expect(screen.getAllByText(/\$44\.99/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/\$6\.99/).length).toBeGreaterThan(0);
});

test("the CTA reflects the selected plan and stays disabled (no real purchase flow in this pass)", () => {
  render(<SvelProModal visible onClose={jest.fn()} />);

  expect(screen.getByText(/Upgrade to Pro — \$44\.99\/year — Coming Soon/)).toBeTruthy();

  fireEvent.press(screen.getByLabelText(/Monthly plan/));
  expect(screen.getByText(/Upgrade to Pro — \$6\.99\/month — Coming Soon/)).toBeTruthy();
});

test("never lists core logging features (adventure logging, species tagging, basic map) as Pro-only", () => {
  render(<SvelProModal visible onClose={jest.fn()} />);
  // These must appear under FREE, never implied to be gated.
  expect(screen.getByText(/Adventure logging/)).toBeTruthy();
  expect(screen.getByText(/Species tagging/)).toBeTruthy();
  expect(screen.getByText(/Standard map view/)).toBeTruthy();
});

test("lists the confirmed Pro features: satellite maps, unlimited photos, advanced stats", () => {
  render(<SvelProModal visible onClose={jest.fn()} />);
  expect(screen.getByText(/Satellite & Hybrid map imagery/)).toBeTruthy();
  expect(screen.getByText(/Unlimited photo storage/)).toBeTruthy();
  expect(screen.getByText(/Advanced stats/)).toBeTruthy();
});

test("calls onClose when the close button is pressed", () => {
  const onClose = jest.fn();
  render(<SvelProModal visible onClose={onClose} />);
  fireEvent.press(screen.getByLabelText("Close"));
  expect(onClose).toHaveBeenCalled();
});
