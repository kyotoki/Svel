// Free-tier limits. Enforced client-side only for now - there's no backend
// concept of a Pro entitlement yet (see the Pro paywall audit), so a hard
// server-side cap would have no way to except a real Pro user once that
// exists. This is the single source both the log form's photo picker (caps
// what gets added) and its UI (shows "x of y") read from.
export const MAX_PHOTOS_PER_ADVENTURE = 6;
