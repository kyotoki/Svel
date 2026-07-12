import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

jest.mock("expo-web-browser", () => ({
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

const mockStartSSOFlow = jest.fn();
jest.mock("@clerk/clerk-expo", () => ({
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
}));

import SocialSignInButtons from "../SocialSignInButtons";

beforeEach(() => {
  mockStartSSOFlow.mockReset();
});

test("tapping Continue with Google starts the SSO flow with the Google strategy", async () => {
  const setActive = jest.fn();
  mockStartSSOFlow.mockResolvedValue({ createdSessionId: "sess_123", setActive });

  render(<SocialSignInButtons onError={jest.fn()} />);
  fireEvent.press(screen.getByLabelText("Continue with Google"));

  await waitFor(() => expect(mockStartSSOFlow).toHaveBeenCalledWith({ strategy: "oauth_google" }));
  expect(setActive).toHaveBeenCalledWith({ session: "sess_123" });
});

test("the same component/flow works for both sign-in and sign-up - no separate mode needed", async () => {
  // Clerk's SSO flow itself decides new-account vs existing-account; there's
  // no "mode" prop to get wrong, which this test exists to lock in.
  const setActive = jest.fn();
  mockStartSSOFlow.mockResolvedValue({ createdSessionId: "sess_789", setActive });

  render(<SocialSignInButtons onError={jest.fn()} />);
  fireEvent.press(screen.getByLabelText("Continue with Google"));

  await waitFor(() => expect(setActive).toHaveBeenCalled());
});

test("a cancelled OAuth flow (no session, no throw) does not surface an error", async () => {
  mockStartSSOFlow.mockResolvedValue({ createdSessionId: null, setActive: undefined });
  const onError = jest.fn();

  render(<SocialSignInButtons onError={onError} />);
  fireEvent.press(screen.getByLabelText("Continue with Google"));

  await waitFor(() => expect(mockStartSSOFlow).toHaveBeenCalled());
  expect(onError).not.toHaveBeenCalled();
});

test("a genuine failure calls onError with Clerk's own message", async () => {
  mockStartSSOFlow.mockRejectedValue({ errors: [{ longMessage: "That Google account is already linked elsewhere." }] });
  const onError = jest.fn();

  render(<SocialSignInButtons onError={onError} />);
  fireEvent.press(screen.getByLabelText("Continue with Google"));

  await waitFor(() => expect(onError).toHaveBeenCalledWith("That Google account is already linked elsewhere."));
});

test("falls back to a generic message when the thrown error has no Clerk-shaped detail", async () => {
  mockStartSSOFlow.mockRejectedValue(new TypeError("Network request failed"));
  const onError = jest.fn();

  render(<SocialSignInButtons onError={onError} />);
  fireEvent.press(screen.getByLabelText("Continue with Google"));

  await waitFor(() => expect(onError).toHaveBeenCalledWith("Unable to continue - please try again."));
});

test("Google disables while its own flow is in progress", async () => {
  let resolveFlow: (value: any) => void = () => {};
  mockStartSSOFlow.mockReturnValue(
    new Promise((resolve) => {
      resolveFlow = resolve;
    })
  );

  render(<SocialSignInButtons onError={jest.fn()} />);
  fireEvent.press(screen.getByLabelText("Continue with Google"));

  await waitFor(() => {
    expect(screen.getByLabelText("Continue with Google").props.accessibilityState.busy).toBe(true);
  });

  resolveFlow({ createdSessionId: null, setActive: undefined });
  await waitFor(() => {
    expect(screen.getByLabelText("Continue with Google").props.accessibilityState.disabled).toBe(false);
  });
});

test("Apple is shown disabled in a Coming Soon state and never starts an SSO flow", () => {
  render(<SocialSignInButtons onError={jest.fn()} />);
  const appleButton = screen.getByLabelText("Continue with Apple");

  expect(appleButton.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText("Apple - Coming Soon")).toBeTruthy();

  fireEvent.press(appleButton);
  expect(mockStartSSOFlow).not.toHaveBeenCalled();
});
