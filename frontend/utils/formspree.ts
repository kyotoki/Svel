import { buildDiagnosticInfo, FORMSPREE_URL } from "../constants/links";

export type FeedbackSource = "feedback" | "contact";

interface SubmitFeedbackParams {
  message: string;
  source: FeedbackSource;
  appVersion: string;
}

// A single Formspree endpoint backs both entry points (Send Feedback and
// Contact Us) - `source` is what lets a submission be told apart in the
// Formspree dashboard and in the resulting email, and `_subject` gives the
// email itself a distinguishing subject line the way the old mailto:
// subjects used to. Diagnostics (app version/platform/OS) are only
// attached for feedback, matching the original mailto behavior where
// Contact Us always had a plain body.
//
// Posted as JSON with an explicit `Accept: application/json`, per
// Formspree's AJAX submission API - this is what makes it work identically
// on web and native (a plain HTML <form> POST, the way the marketing
// landing page's email signup does it, isn't available in React Native;
// this is the same endpoint, just submitted the way a non-browser client
// has to).
export async function submitFeedback({ message, source, appVersion }: SubmitFeedbackParams): Promise<boolean> {
  const body: Record<string, string> = {
    message,
    source,
    _subject: source === "feedback" ? "Svel Feedback" : "Svel Support",
    // Formspree's honeypot convention (see website/index.html's own form) -
    // a hidden field real users never fill in; bots that blindly fill every
    // field trip it and get silently rejected.
    _gotcha: "",
  };
  if (source === "feedback") {
    body.diagnostics = buildDiagnosticInfo(appVersion);
  }

  try {
    const response = await fetch(FORMSPREE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}
