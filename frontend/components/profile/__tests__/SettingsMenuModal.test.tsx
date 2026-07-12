import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking, Share } from "react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

jest.mock("../../../utils/crossPlatformAlert", () => ({
  showAlert: jest.fn(),
}));

import { showAlert } from "../../../utils/crossPlatformAlert";
import SettingsMenuModal from "../SettingsMenuModal";

// react-native's jest preset already stubs Linking.openURL as a persistent
// jest.fn() - jest.spyOn on an already-mocked property returns that same
// shared mock rather than wrapping a fresh one, so restoreAllMocks doesn't
// reset its call history between tests. mockClear() explicitly does.
let openURLMock: jest.Mock;
let shareMock: jest.Mock;
let fetchMock: jest.Mock;

beforeEach(() => {
  openURLMock = jest.spyOn(Linking, "openURL").mockResolvedValue(true) as unknown as jest.Mock;
  shareMock = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" }) as unknown as jest.Mock;
  openURLMock.mockClear();
  shareMock.mockClear();

  fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function renderMenu(overrides: Partial<React.ComponentProps<typeof SettingsMenuModal>> = {}) {
  return render(
    <SettingsMenuModal
      visible
      onClose={jest.fn()}
      onEditProfile={jest.fn()}
      onOpenSvelPro={jest.fn()}
      onLogOut={jest.fn()}
      appVersion="1.2.3"
      {...overrides}
    />
  );
}

// Walks the rendered JSON tree collecting every string of visible text, in
// the order React actually rendered them - the most direct way to verify
// "restructure to match this order exactly" without relying on any
// particular query API's own ordering guarantees.
function collectTextInOrder(node: unknown, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === "string") {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectTextInOrder(child, out);
    return out;
  }
  if (typeof node === "object" && "children" in (node as any)) {
    collectTextInOrder((node as any).children, out);
  }
  return out;
}

function indexOfText(all: string[], text: string): number {
  const index = all.findIndex((t) => t === text);
  if (index === -1) {
    throw new Error(`Expected to find text "${text}" in rendered output: ${JSON.stringify(all)}`);
  }
  return index;
}

test("renders every section in the specified top-to-bottom order", () => {
  const { toJSON } = renderMenu();
  const all = collectTextInOrder(toJSON());

  const order = [
    "Settings",
    "Svel",
    "1.2.3",
    "Svel Pro Membership",
    "Account",
    "Log Out",
    "SUPPORT",
    "Rate Svel",
    "Share Svel",
    "Send Feedback",
    "Contact Us",
    "LEGAL",
    "Privacy Policy",
    "Terms of Use",
    "Delete Account",
  ];

  const indices = order.map((text) => indexOfText(all, text));
  const sorted = [...indices].sort((a, b) => a - b);
  expect(indices).toEqual(sorted);
});

test("tapping Account calls onEditProfile", () => {
  const onEditProfile = jest.fn();
  renderMenu({ onEditProfile });
  fireEvent.press(screen.getByText("Account"));
  expect(onEditProfile).toHaveBeenCalled();
});

test("tapping Log Out calls onLogOut directly (confirmation lives in the caller)", () => {
  const onLogOut = jest.fn();
  renderMenu({ onLogOut });
  fireEvent.press(screen.getByText("Log Out"));
  expect(onLogOut).toHaveBeenCalled();
});

test("Delete Account shows a confirmation rather than deleting anything", () => {
  renderMenu();
  fireEvent.press(screen.getByText("Delete Account"));

  expect(showAlert).toHaveBeenCalledWith(
    "Delete Account",
    expect.stringContaining("isn't available"),
    expect.any(Array)
  );
});

test("Rate Svel opens the platform store URL", () => {
  renderMenu();
  fireEvent.press(screen.getByText("Rate Svel"));
  expect(openURLMock).toHaveBeenCalledWith(expect.stringContaining("http"));
});

test("Share Svel opens the native share sheet", () => {
  renderMenu();
  fireEvent.press(screen.getByText("Share Svel"));
  expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Svel") }));
});

test("Send Feedback opens the in-app feedback form (not an external mail app)", () => {
  renderMenu();
  fireEvent.press(screen.getByText("Send Feedback"));

  // Two "Send Feedback" strings now exist: the settings row and the
  // form's own header - proves the form actually opened, not just that
  // the row is present.
  expect(screen.getAllByText("Send Feedback")).toHaveLength(2);
  expect(screen.getByPlaceholderText(/species that's missing/i)).toBeTruthy();
  expect(openURLMock).not.toHaveBeenCalled();
});

test("Contact Us opens the same in-app form with its own title and a plain placeholder", () => {
  renderMenu();
  fireEvent.press(screen.getByText("Contact Us"));

  expect(screen.getAllByText("Contact Us")).toHaveLength(2);
  expect(screen.getByPlaceholderText("How can we help?")).toBeTruthy();
  expect(openURLMock).not.toHaveBeenCalled();
});

test("submitting from Send Feedback posts to Formspree with source \"feedback\" and diagnostics attached", async () => {
  renderMenu({ appVersion: "1.2.3" });
  fireEvent.press(screen.getByText("Send Feedback"));
  fireEvent.changeText(screen.getByPlaceholderText(/species that's missing/i), "Please add Napoleon Wrasse");
  fireEvent.press(screen.getByText("Send"));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [url, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body);

  expect(url).toBe("https://formspree.io/f/xzdnpgop");
  expect(body.source).toBe("feedback");
  expect(body.message).toBe("Please add Napoleon Wrasse");
  expect(body.diagnostics).toContain("App Version: 1.2.3");
  expect(await screen.findByText("Thanks, we got it.")).toBeTruthy();
});

test("submitting from Contact Us posts to Formspree with source \"contact\" and no diagnostics", async () => {
  renderMenu();
  fireEvent.press(screen.getByText("Contact Us"));
  fireEvent.changeText(screen.getByPlaceholderText("How can we help?"), "My photos won't upload");
  fireEvent.press(screen.getByText("Send"));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body);

  expect(body.source).toBe("contact");
  expect(body.message).toBe("My photos won't upload");
  expect(body.diagnostics).toBeUndefined();
  expect(await screen.findByText("Thanks, we got it.")).toBeTruthy();
});

test("Privacy Policy and Terms of Use each open their own URL", () => {
  renderMenu();

  fireEvent.press(screen.getByText("Privacy Policy"));
  fireEvent.press(screen.getByText("Terms of Use"));

  expect(openURLMock).toHaveBeenCalledTimes(2);
  expect(openURLMock.mock.calls[0][0]).not.toEqual(openURLMock.mock.calls[1][0]);
});
