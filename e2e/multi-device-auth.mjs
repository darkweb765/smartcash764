/**
 * End-to-end multi-device authentication test.
 *
 * Scenario covered:
 *   Device A: register  ->  account data loads  ->  logout
 *   Device B: fresh session, login with messy-typed email  -> SAME account
 *   Device C: fresh session, login again                   -> SAME account
 *   Device D: wrong password                               -> correctly rejected
 *
 * Each "device" is a brand new Supabase client with its own isolated
 * in-memory storage, so nothing is shared between them (no localStorage,
 * no cookies, no device fingerprint).
 *
 * Run with:  npm run test:e2e
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// --- config -----------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

// Mirrors src/lib/ensureUserRecords.ts
const normalizeEmail = (value) => value.trim().toLowerCase();

const memoryStorage = () => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
};

/** A brand new, completely isolated "device". */
const newDevice = (name) => {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: memoryStorage(),
      storageKey: `e2e-${name}-${Math.random().toString(36).slice(2)}`,
      persistSession: true,
      autoRefreshToken: false,
    },
  });
  return { name, client };
};

// --- tiny test harness ------------------------------------------------
let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` -> ${detail}` : ""}`);
  }
};

const stamp = Date.now();
const EMAIL = `e2e.multidevice.${stamp}@smartpay-e2e.test`;
const PASSWORD = `Sp!${stamp}xQ7`;
const USERNAME = `E2E Tester ${stamp}`;

const loadAccount = async (client) => {
  const { data: userRes } = await client.auth.getUser();
  const user = userRes?.user;
  if (!user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("user_id, username")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: state } = await client
    .from("user_app_state")
    .select("user_id, balance")
    .eq("user_id", user.id)
    .maybeSingle();
  return { id: user.id, email: user.email, profile, state };
};

const run = async () => {
  console.log(`\nMulti-device auth e2e\naccount: ${EMAIL}\n`);

  // ---- Device A: registration ---------------------------------------
  console.log("Device A - registration");
  const a = newDevice("A");
  const { data: signUpData, error: signUpError } = await a.client.auth.signUp({
    email: normalizeEmail(`  ${EMAIL.toUpperCase()}  `),
    password: PASSWORD,
    options: { data: { username: USERNAME } },
  });
  check("registration succeeds", !signUpError, signUpError?.message);
  check("registration returns a session", !!signUpData?.session);
  if (signUpError) {
    process.exit(1);
  }

  // Give the signup trigger a moment to create the profile rows.
  await new Promise((r) => setTimeout(r, 1500));

  const accountA = await loadAccount(a.client);
  check("device A loads the account", !!accountA?.id);
  check("device A has a profile row", !!accountA?.profile, JSON.stringify(accountA?.profile));
  check("device A has an app state row", !!accountA?.state);
  check("new account starts with a zero balance", Number(accountA?.state?.balance ?? -1) === 0);
  check("email stored lowercase", accountA?.email === EMAIL.toLowerCase(), accountA?.email);

  // ---- logout --------------------------------------------------------
  await a.client.auth.signOut();
  const { data: afterLogout } = await a.client.auth.getSession();
  check("logout clears the session on device A", !afterLogout?.session);

  // ---- Device B: messy typing, fresh session -------------------------
  console.log("\nDevice B - login on a second device");
  const b = newDevice("B");
  const { data: bData, error: bError } = await b.client.auth.signInWithPassword({
    email: normalizeEmail(`  ${EMAIL.replace("e2e", "E2E")}  `), // spaces + caps
    password: PASSWORD,
  });
  check("login succeeds with messy-typed email", !bError && !!bData?.session, bError?.message);
  const accountB = await loadAccount(b.client);
  check("device B opens the SAME account id", accountB?.id === accountA?.id);
  check("device B still sees the existing profile", accountB?.profile?.username === accountA?.profile?.username);
  check("device B still sees the existing balance", Number(accountB?.state?.balance) === Number(accountA?.state?.balance));

  // ---- Device C: third device ---------------------------------------
  console.log("\nDevice C - login on a third device");
  const c = newDevice("C");
  const { data: cData, error: cError } = await c.client.auth.signInWithPassword({
    email: normalizeEmail(EMAIL),
    password: PASSWORD,
  });
  check("login succeeds on a third device", !cError && !!cData?.session, cError?.message);
  const accountC = await loadAccount(c.client);
  check("device C opens the SAME account id", accountC?.id === accountA?.id);
  check("device C loads the existing profile data", !!accountC?.profile);

  // ---- Device B session survives a login elsewhere -------------------
  const accountBAfter = await loadAccount(b.client);
  check("device B stays signed in after device C logs in", accountBAfter?.id === accountA?.id);

  // ---- Device D: wrong password --------------------------------------
  console.log("\nDevice D - wrong password");
  const d = newDevice("D");
  const { data: dData, error: dError } = await d.client.auth.signInWithPassword({
    email: normalizeEmail(EMAIL),
    password: `${PASSWORD}-wrong`,
  });
  check("wrong password is rejected", !!dError && !dData?.session);
  check("no session is created for a bad password", !(await d.client.auth.getSession()).data.session);

  // ---- report ---------------------------------------------------------
  console.log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}` +
      `\nTest account left behind (delete when done): ${EMAIL}\n`
  );
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error("e2e run crashed:", e);
  process.exit(1);
});
