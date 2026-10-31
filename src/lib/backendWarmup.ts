// Wakes the hosted backend early (and again whenever the user returns to the
// app) so the first real data call doesn't hang while the backend cold-starts.
// The ping is fire-and-forget and never blocks rendering.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

let lastPing = 0;
const PING_MIN_INTERVAL_MS = 30_000;

export const warmBackend = () => {
  if (!SUPABASE_URL) return;
  const now = Date.now();
  if (now - lastPing < PING_MIN_INTERVAL_MS) return;
  lastPing = now;
  try {
    fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: PUBLISHABLE_KEY },
      cache: "no-store",
    }).catch(() => {});
  } catch {
    // Never let the ping interfere with the app.
  }
};

/**
 * Runs `fn` immediately and again each time the app becomes visible
 * (user comes back to the app after backgrounding/leaving it).
 * Returns an unsubscribe function.
 */
export const onAppReturn = (fn: () => void) => {
  fn();
  const handler = () => {
    if (document.visibilityState === "visible") {
      warmBackend();
      fn();
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
};
