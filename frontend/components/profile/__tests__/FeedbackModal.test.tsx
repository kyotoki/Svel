import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

import FeedbackModal from "../FeedbackModal";

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
});

function typeMessage(text: string) {
  const input = screen.getByPlaceholderText(/species that's missing|how can we help/i);
  fireEvent.changeText(input, text);
  return input;
}

function isSubmitDisabled(): boolean {
  return screen.getByTestId("feedback-submit-button").props.accessibilityState?.disabled === true;
}

test("the Send button is disabled until a message is typed, and enables once one is", () => {
  render(<FeedbackModal visible source="feedback" appVersion="1.0.0" onClose={jest.fn()} />);
  expect(isSubmitDisabled()).toBe(true);

  typeMessage("Whitetip reef sharks near Tofo");
  expect(isSubmitDisabled()).toBe(false);
});

test("a whitespace-only message leaves the Send button disabled", () => {
  render(<FeedbackModal visible source="contact" appVersion="1.0.0" onClose={jest.fn()} />);
  typeMessage("   ");
  expect(isSubmitDisabled()).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("pressing the disabled Send button directly does not throw or submit (regression: RNTL bubbles the event to the card's stopPropagation handler with no event object)", () => {
  render(<FeedbackModal visible source="feedback" appVersion="1.0.0" onClose={jest.fn()} />);
  expect(isSubmitDisabled()).toBe(true);

  expect(() => fireEvent.press(screen.getByTestId("feedback-submit-button"))).not.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("posts the trimmed message, source, and a distinguishing subject to Formspree", async () => {
  render(<FeedbackModal visible source="feedback" appVersion="2.1.0" onClose={jest.fn()} />);
  typeMessage("  Please add hammerhead sharks  ");
  fireEvent.press(screen.getByText("Send"));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const [url, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body);

  expect(url).toBe("https://formspree.io/f/xzdnpgop");
  expect(init.headers.Accept).toBe("application/json");
  expect(body.message).toBe("Please add hammerhead sharks");
  expect(body.source).toBe("feedback");
  expect(body._subject).toBe("Svel Feedback");
});

test("Contact Us submissions use the Svel Support subject and carry no diagnostics field at all", async () => {
  render(<FeedbackModal visible source="contact" appVersion="2.1.0" onClose={jest.fn()} />);
  typeMessage("Where do I change units?");
  fireEvent.press(screen.getByText("Send"));

  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);

  expect(body._subject).toBe("Svel Support");
  expect("diagnostics" in body).toBe(false);
});

test("shows a clear success state after a successful submission", async () => {
  render(<FeedbackModal visible source="feedback" appVersion="1.0.0" onClose={jest.fn()} />);
  typeMessage("Great app!");
  fireEvent.press(screen.getByText("Send"));

  expect(await screen.findByText("Thanks, we got it.")).toBeTruthy();
  expect(screen.queryByPlaceholderText(/species that's missing/i)).toBeNull();
});

test("shows a clear, non-silent error state when the request fails, and keeps the typed message", async () => {
  fetchMock.mockResolvedValue({ ok: false });
  render(<FeedbackModal visible source="contact" appVersion="1.0.0" onClose={jest.fn()} />);
  typeMessage("Testing failure");
  fireEvent.press(screen.getByText("Send"));

  expect(await screen.findByText(/something went wrong/i)).toBeTruthy();
  // Not cleared - the user shouldn't have to retype their message to retry.
  expect(screen.getByDisplayValue("Testing failure")).toBeTruthy();
});

test("shows the same error state when the network request throws outright (no internet)", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  render(<FeedbackModal visible source="feedback" appVersion="1.0.0" onClose={jest.fn()} />);
  typeMessage("Testing offline");
  fireEvent.press(screen.getByText("Send"));

  expect(await screen.findByText(/something went wrong/i)).toBeTruthy();
});

test("uses a distinct title and placeholder per source, from the same component", () => {
  const { rerender } = render(<FeedbackModal visible source="feedback" appVersion="1.0.0" onClose={jest.fn()} />);
  expect(screen.getByText("Send Feedback")).toBeTruthy();
  expect(screen.getByPlaceholderText(/species that's missing/i)).toBeTruthy();

  rerender(<FeedbackModal visible source="contact" appVersion="1.0.0" onClose={jest.fn()} />);
  expect(screen.getByText("Contact Us")).toBeTruthy();
  expect(screen.getByPlaceholderText("How can we help?")).toBeTruthy();
});
