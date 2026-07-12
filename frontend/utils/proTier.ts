// No real entitlement system exists yet - no RevenueCat/StoreKit/Play
// Billing wired up (see SvelProModal's disabled "Coming Soon" CTA). This is
// the one place that changes once real purchases exist (reading from a
// purchase SDK's customer info / a synced backend entitlement, most
// likely) - every consumer (satellite map gate, photo cap, Pro stats
// section) reads from here rather than hardcoding `false` at each call
// site, so flipping this on later is a one-line change, not a hunt through
// the app for gates.
export function useIsProUser(): boolean {
  return false;
}
