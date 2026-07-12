import { submitFeedback } from "../formspree";

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
});

test("posts JSON with an Accept: application/json header, per Formspree's AJAX API", async () => {
  await submitFeedback({ message: "hi", source: "contact", appVersion: "1.0.0" });

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://formspree.io/f/xzdnpgop");
  expect(init.method).toBe("POST");
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(init.headers.Accept).toBe("application/json");
});

test("includes a honeypot field, matching the landing page form's own spam-prevention convention", async () => {
  await submitFeedback({ message: "hi", source: "contact", appVersion: "1.0.0" });
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body._gotcha).toBe("");
});

test("attaches diagnostics only for the feedback source, not contact", async () => {
  await submitFeedback({ message: "hi", source: "feedback", appVersion: "3.0.0" });
  const feedbackBody = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(feedbackBody.diagnostics).toContain("App Version: 3.0.0");

  await submitFeedback({ message: "hi", source: "contact", appVersion: "3.0.0" });
  const contactBody = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(contactBody.diagnostics).toBeUndefined();
});

test("resolves false (not a throw) when the request fails outright", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await expect(submitFeedback({ message: "hi", source: "contact", appVersion: "1.0.0" })).resolves.toBe(false);
});

test("resolves false when Formspree responds with a non-ok status", async () => {
  fetchMock.mockResolvedValue({ ok: false });
  await expect(submitFeedback({ message: "hi", source: "contact", appVersion: "1.0.0" })).resolves.toBe(false);
});

test("resolves true on a successful submission", async () => {
  await expect(submitFeedback({ message: "hi", source: "contact", appVersion: "1.0.0" })).resolves.toBe(true);
});
