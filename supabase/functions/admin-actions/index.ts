import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const JWT_SECRET = Deno.env.get("ADMIN_JWT_SECRET") || "";
const PAYMENT_ACCOUNT_NUMBER = Deno.env.get("PAYMENT_ACCOUNT_NUMBER") || "5227367627";
const PAYMENT_BANK_NAME = Deno.env.get("PAYMENT_BANK_NAME") || "Moniepoint MFB";
const PAYMENT_ACCOUNT_NAME = Deno.env.get("PAYMENT_ACCOUNT_NAME") || "Oluebube Jude Olimba";
const PAYMENT_AMOUNT = Deno.env.get("PAYMENT_AMOUNT") || "7200";
const SERVICE_VERIFICATION_CODE = Deno.env.get("SERVICE_VERIFICATION_CODE") || "3517";
const PURCHASE_CONFIRMATION_TTL_MS = 3 * 60 * 60 * 1000;

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ---------- JWT (HS256) ----------
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64urlEncode = (data: Uint8Array | string) => {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

const b64urlDecode = (s: string) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const getKey = async () => {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
};

const signJwt = async (payload: Record<string, unknown>) => {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const key = await getKey();
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return `${data}.${b64urlEncode(sig)}`;
};

const verifyJwt = async (token: string): Promise<any | null> => {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const key = await getKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(s),
      enc.encode(`${h}.${p}`)
    );
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDecode(p)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
};

// ---------- Validation ----------
const isEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPassword = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 8 && v.length <= 128;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const saveUserNotification = async (
  supabase: any,
  userId: string,
  type: string,
  message: string,
  amount: number | null = null,
) => {
  const { data: existing } = await supabase
    .from("user_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("message", message)
    .limit(1);

  if (existing?.length) return;

  await supabase.from("user_notifications").insert({
    user_id: userId,
    type,
    message,
    amount,
  });
};

// ---------- Money helpers ----------
const findUserByEmail = async (supabase: any, email: string) => {
  const target = email.toLowerCase().trim();
  let page = 1;
  while (page < 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const list = data?.users || [];
    const hit = list.find((u: any) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (list.length < 200) break;
    page++;
  }
  return null;
};

const adjustBalance = async (supabase: any, userId: string, delta: number) => {
  const { data: state } = await supabase
    .from("user_app_state")
    .select("balance, gift_claimed")
    .eq("user_id", userId)
    .maybeSingle();
  const current = Number(state?.balance || 0);
  const next = Math.max(0, current + delta);
  await supabase.from("user_app_state").upsert(
    {
      user_id: userId,
      balance: next,
      gift_claimed: next > 0 ? true : false,
    },
    { onConflict: "user_id" },
  );
  return next;
};

const deliverTransfer = async (supabase: any, transfer: any) => {
  const amount = Number(transfer.amount || 0);
  const isCredit = transfer.direction !== "debit";
  const balanceAfter = await adjustBalance(supabase, transfer.user_id, isCredit ? amount : -amount);

  await supabase.from("user_notifications").insert({
    user_id: transfer.user_id,
    type: isCredit ? "bank_credit" : "bank_debit",
    amount,
    message: isCredit
      ? `Credit Alert: NGN${amount.toLocaleString("en-NG")} from ${transfer.sender_name}`
      : `Debit Alert: NGN${amount.toLocaleString("en-NG")} to ${transfer.sender_name}`,
    meta: {
      sender_name: transfer.sender_name,
      sender_bank: transfer.sender_bank,
      amount,
      direction: isCredit ? "credit" : "debit",
      balance_after: balanceAfter,
      reference: `SPY${Date.now().toString().slice(-10)}`,
      occurred_at: new Date().toISOString(),
    },
  });

  await supabase
    .from("scheduled_transfers")
    .update({ status: "delivered", processed_at: new Date().toISOString() })
    .eq("id", transfer.id);

  return balanceAfter;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!JWT_SECRET) return json({ error: "Server misconfigured" }, 500);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  // Public actions: no admin token required (each validates user/input itself)
  const publicActions = new Set([
    "admin_login", "admin_register", "admin_status",
    "get_payment_details", "verify_service_code",
    "verify_admin_withdraw_pin", "verify_master_code",
    "process_scheduled_transfers",
  ]);



  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ---------- Admin auth gate ----------
  let adminPayload: any = null;
  if (!publicActions.has(action)) {
    const auth = req.headers.get("authorization") || req.headers.get("x-admin-token") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    adminPayload = await verifyJwt(token);
    if (!adminPayload?.sub || !adminPayload?.jti) return json({ error: "Unauthorized" }, 401);

    // Verify session not revoked + still exists
    const { data: sess } = await supabase
      .from("admin_sessions")
      .select("id, revoked, expires_at")
      .eq("jti", adminPayload.jti)
      .maybeSingle();
    if (!sess || sess.revoked || new Date(sess.expires_at) < new Date()) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  try {
    // ---------- AUTH ENDPOINTS ----------

    // Whether any admin exists (used by login screen to show register option)
    if (req.method === "GET" && action === "admin_status") {
      const { count } = await supabase
        .from("admins")
        .select("id", { count: "exact", head: true });
      return json({ has_admin: (count || 0) > 0 });
    }

    // First-admin self-registration. Only allowed when no admin exists yet.
    if (req.method === "POST" && action === "admin_register") {
      const body = await req.json().catch(() => ({}));
      if (!isEmail(body.email) || !isPassword(body.password)) {
        return json({ error: "Invalid email or password (min 8 chars)" }, 400);
      }
      const { count } = await supabase
        .from("admins")
        .select("id", { count: "exact", head: true });
      if ((count || 0) > 0) return json({ error: "Registration is locked" }, 403);

      const hash = bcrypt.hashSync(body.password, bcrypt.genSaltSync(10));
      const { error } = await supabase.from("admins").insert({
        email: body.email.toLowerCase(),
        password_hash: hash,
      });
      if (error) return json({ error: "Could not create admin" }, 500);
      return json({ success: true });
    }

    // Login → returns JWT
    if (req.method === "POST" && action === "admin_login") {
      const body = await req.json().catch(() => ({}));
      if (!isEmail(body.email) || typeof body.password !== "string") {
        return json({ error: "Invalid credentials" }, 400);
      }
      const email = body.email.toLowerCase();
      const { data: admin } = await supabase
        .from("admins")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (!admin) return json({ error: "Invalid credentials" }, 401);

      if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        return json({ error: "Account locked. Try again later." }, 423);
      }

      const ok = bcrypt.compareSync(body.password, admin.password_hash);
      if (!ok) {
        const attempts = (admin.failed_attempts || 0) + 1;
        const updates: any = { failed_attempts: attempts };
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          updates.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
          updates.failed_attempts = 0;
        }
        await supabase.from("admins").update(updates).eq("id", admin.id);
        return json({ error: "Invalid credentials" }, 401);
      }

      // Issue token + session
      const jti = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      const exp = now + TOKEN_TTL_SECONDS;
      const token = await signJwt({ sub: admin.id, email: admin.email, jti, iat: now, exp });

      await supabase.from("admin_sessions").insert({
        admin_id: admin.id,
        jti,
        expires_at: new Date(exp * 1000).toISOString(),
        user_agent: req.headers.get("user-agent") || null,
      });
      await supabase.from("admins").update({
        failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString(),
      }).eq("id", admin.id);

      return json({ token, expires_at: exp });
    }

    // Authenticated: get current admin info
    if (req.method === "GET" && action === "admin_me") {
      return json({ id: adminPayload.sub, email: adminPayload.email });
    }

    // Logout current session
    if (req.method === "POST" && action === "admin_logout") {
      await supabase.from("admin_sessions").update({ revoked: true }).eq("jti", adminPayload.jti);
      return json({ success: true });
    }

    // Logout from all devices
    if (req.method === "POST" && action === "admin_logout_all") {
      await supabase.from("admin_sessions").update({ revoked: true }).eq("admin_id", adminPayload.sub);
      return json({ success: true });
    }

    // ---------- PUBLIC USER-FACING ----------

    if (req.method === "GET" && action === "get_payment_details") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      return json({
        account_number: data?.account_number || PAYMENT_ACCOUNT_NUMBER,
        bank_name: data?.bank_name || PAYMENT_BANK_NAME,
        account_name: data?.account_name || PAYMENT_ACCOUNT_NAME,
        amount: data?.amount || PAYMENT_AMOUNT,
      });
    }

    if (req.method === "POST" && action === "verify_service_code") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => ({}));
      return json({ valid: body.code === SERVICE_VERIFICATION_CODE });
    }

    // Admin-only withdrawal PIN bypass. Requires:
    //  1. A valid, non-revoked admin JWT (from /admin-login session) in x-admin-token
    //  2. The caller's Supabase user email matches that admin's email
    //  3. The PIN matches the ADMIN_WITHDRAW_PIN secret
    if (req.method === "POST" && action === "verify_admin_withdraw_pin") {
      const ADMIN_PIN = Deno.env.get("ADMIN_WITHDRAW_PIN") || "";
      if (!ADMIN_PIN) return json({ valid: false }, 500);

      // (1) Admin session token — must be currently logged into admin panel
      const adminToken = (req.headers.get("x-admin-token") || "").trim();
      if (!adminToken) return json({ valid: false, error: "Admin session required" }, 401);
      const adminPl = await verifyJwt(adminToken);
      if (!adminPl?.sub || !adminPl?.jti) {
        return json({ valid: false, error: "Admin session invalid" }, 401);
      }
      const { data: sess } = await supabase
        .from("admin_sessions")
        .select("id, revoked, expires_at")
        .eq("jti", adminPl.jti)
        .maybeSingle();
      if (!sess || sess.revoked || new Date(sess.expires_at) < new Date()) {
        return json({ valid: false, error: "Admin session expired" }, 401);
      }

      // (2) PIN check
      const body = await req.json().catch(() => ({}));
      if (typeof body.pin !== "string" || body.pin !== ADMIN_PIN) {
        return json({ valid: false });
      }
      return json({ valid: true });
    }

    // Verify an admin-generated master withdrawal code. Requires the user to be
    // logged in (Supabase JWT in Authorization). One-time use: marks the code used.
    if (req.method === "POST" && action === "verify_master_code") {
      const authHeader = req.headers.get("authorization") || "";
      const userToken = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!userToken) return json({ valid: false, error: "Unauthorized" }, 401);
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${userToken}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ valid: false, error: "Unauthorized" }, 401);

      const body = await req.json().catch(() => ({}));
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!code) return json({ valid: false });

      const { data: row } = await supabase
        .from("admin_master_codes")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (!row) return json({ valid: false });
      if (row.used_at) return json({ valid: false, error: "Code already used" });

      await supabase
        .from("admin_master_codes")
        .update({ used_at: new Date().toISOString(), used_by_user_id: user.id })
        .eq("id", row.id);
      return json({ valid: true });
    }

    // ---------- ADMIN-ONLY ENDPOINTS ----------


    if (req.method === "GET" && action === "pending_purchases") {
      const { data, error } = await supabase
        .from("promo_purchases").select("*").eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "GET" && action === "all_purchases") {
      // Merge every registered user with any promo purchase they've made.
      // Newest registrations sit at the bottom; users with a PENDING purchase
      // float to the top so admin can verify their payment quickly.
      const { data: purchases } = await supabase
        .from("promo_purchases").select("*").order("created_at", { ascending: false });
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, username, created_at");
      const { data: appStates } = await supabase
        .from("user_app_state").select("user_id, wallet_unlocked");
      const walletUnlockedById: Record<string, boolean> = {};
      for (const s of (appStates || [])) walletUnlockedById[s.user_id] = !!s.wallet_unlocked;


      // Fetch auth users (for email + created_at fallback)
      const emailById: Record<string, string> = {};
      const userCreatedById: Record<string, string> = {};
      try {
        let page = 1;
        while (true) {
          const { data: usersPage } = await (supabase as any).auth.admin.listUsers({ page, perPage: 200 });
          const list = usersPage?.users || [];
          for (const u of list) {
            if (u.email) emailById[u.id] = u.email;
            if (u.created_at) userCreatedById[u.id] = u.created_at;
          }
          if (list.length < 200) break;
          page++;
          if (page > 25) break;
        }
      } catch (_) { /* ignore, best effort */ }

      // Latest purchase per user
      const latestPurchase: Record<string, any> = {};
      for (const p of (purchases || [])) {
        if (!latestPurchase[p.user_id]) latestPurchase[p.user_id] = p;
      }

      const seen = new Set<string>();
      const rows: any[] = [];
      for (const prof of (profiles || [])) {
        seen.add(prof.user_id);
        const pur = latestPurchase[prof.user_id];
        rows.push({
          id: pur?.id || prof.user_id,
          user_id: prof.user_id,
          full_name: pur?.full_name || prof.username || "User",
          email: pur?.email || emailById[prof.user_id] || "",
          username: pur?.username || prof.username || "User",
          status: pur?.status || "registered",
          created_at: pur?.created_at || prof.created_at,
          registered_at: prof.created_at || userCreatedById[prof.user_id],
          receipt_image: pur?.receipt_image || null,
          wallet_unlocked: !!walletUnlockedById[prof.user_id],

        });
      }
      // Any purchase whose profile went missing — still include it
      for (const p of (purchases || [])) {
        if (seen.has(p.user_id)) continue;
        seen.add(p.user_id);
        rows.push({
          id: p.id, user_id: p.user_id,
          full_name: p.full_name, email: p.email, username: p.username,
          status: p.status, created_at: p.created_at,
          registered_at: userCreatedById[p.user_id] || p.created_at,
          receipt_image: p.receipt_image || null,
          wallet_unlocked: !!walletUnlockedById[p.user_id],

        });
      }

      rows.sort((a, b) => {
        const aPending = a.status === "pending" ? 1 : 0;
        const bPending = b.status === "pending" ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending; // pending on top
        if (aPending) {
          // Both pending: most recent purchase first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // Non-pending: oldest registrations first, newest at bottom
        const at = new Date(a.registered_at || a.created_at).getTime();
        const bt = new Date(b.registered_at || b.created_at).getTime();
        return at - bt;
      });

      return json(rows);
    }

    if (req.method === "GET" && action === "pending_activations") {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*, promo_purchases(full_name, email, username)")
        .eq("is_activated", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "GET" && action === "pending_withdrawals") {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, promo_codes(code, promo_purchases(full_name, email, username))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "GET" && action === "alerts") {
      const { data: codes, error: cErr } = await supabase
        .from("promo_codes")
        .select("*, promo_purchases(full_name, email, username)")
        .order("created_at", { ascending: false });
      if (cErr) throw cErr;

      const { data: withdrawals, error: wErr } = await supabase
        .from("withdrawal_requests")
        .select("*, promo_codes(code, withdrawal_stage, promo_purchases(full_name, email, username))")
        .order("created_at", { ascending: false });
      if (wErr) throw wErr;

      return json({ codes: codes || [], withdrawals: withdrawals || [] });
    }

    if (req.method === "GET" && action === "chat_conversations") {
      // Show every registered user, even without messages.
      // Users with messages sort to the top by newest message.
      // Users without messages sort to the bottom by registration time
      // (oldest first, newest at the bottom).
      const { data: msgs } = await supabase
        .from("chat_messages").select("*").order("created_at", { ascending: false });
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, username, created_at");

      const latestByUser: Record<string, any> = {};
      for (const m of (msgs || [])) {
        if (!latestByUser[m.user_id]) latestByUser[m.user_id] = m;
      }

      // Emails from auth
      const emailById: Record<string, string> = {};
      try {
        let page = 1;
        while (true) {
          const { data: usersPage } = await (supabase as any).auth.admin.listUsers({ page, perPage: 200 });
          const list = usersPage?.users || [];
          for (const u of list) { if (u.email) emailById[u.id] = u.email; }
          if (list.length < 200) break;
          page++;
          if (page > 25) break;
        }
      } catch (_) {}

      const seen = new Set<string>();
      const conversations: any[] = [];
      for (const prof of (profiles || [])) {
        seen.add(prof.user_id);
        const last = latestByUser[prof.user_id];
        conversations.push({
          user_id: prof.user_id,
          username: prof.username || "User",
          email: emailById[prof.user_id] || "",
          last_message: last?.message || "",
          last_message_time: last?.created_at || null,
          sender_type: last?.sender_type || null,
          registered_at: prof.created_at,
          has_message: !!last,
        });
      }
      // Any message-user without a profile row
      for (const uid of Object.keys(latestByUser)) {
        if (seen.has(uid)) continue;
        const last = latestByUser[uid];
        conversations.push({
          user_id: uid,
          username: "User",
          email: emailById[uid] || "",
          last_message: last.message,
          last_message_time: last.created_at,
          sender_type: last.sender_type,
          registered_at: last.created_at,
          has_message: true,
        });
      }

      conversations.sort((a, b) => {
        if (a.has_message !== b.has_message) return a.has_message ? -1 : 1;
        if (a.has_message) {
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        }
        return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime();
      });

      // Backfill any missing email from promo_purchases
      for (const conv of conversations) {
        if (conv.email) continue;
        const { data: pp } = await supabase
          .from("promo_purchases").select("email").eq("user_id", conv.user_id).limit(1);
        if (pp && pp.length > 0) conv.email = pp[0].email;
      }

      return json(conversations);
    }

    if (req.method === "GET" && action === "chat_messages") {
      const userId = url.searchParams.get("user_id");
      if (!userId) return json({ error: "user_id required" }, 400);
      const { data, error } = await supabase
        .from("chat_messages").select("*").eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "GET" && action === "reports") {
      const { data: tickets, error } = await supabase
        .from("support_tickets").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((tickets || []).map((t: any) => t.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles").select("*").in("user_id", userIds);
        profiles = pData || [];
      }
      const enriched = (tickets || []).map((t: any) => {
        const profile = profiles.find((p: any) => p.user_id === t.user_id);
        return { ...t, username: profile?.username || "User" };
      });
      for (const t of enriched) {
        const { data: pp } = await supabase
          .from("promo_purchases").select("email").eq("user_id", t.user_id).limit(1);
        t.email = pp && pp.length > 0 ? pp[0].email : "unknown@email.com";
      }
      return json(enriched);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      if (body.action === "verify_payment") {
        const { purchase_id } = body;
        if (typeof purchase_id !== "string") return json({ error: "Invalid input" }, 400);
        const { data: purchase, error: pErr } = await supabase
          .from("promo_purchases").select("*").eq("id", purchase_id).single();
        if (pErr) throw pErr;

        const { data: existingCode } = await supabase
          .from("promo_codes")
          .select("code, created_at")
          .eq("user_id", purchase.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const withinCooldown = existingCode
          ? Date.now() - new Date(existingCode.created_at).getTime() <= PURCHASE_CONFIRMATION_TTL_MS
          : false;
        if (existingCode && withinCooldown) {
          await supabase.from("promo_purchases").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", purchase_id);
          await saveUserNotification(supabase, purchase.user_id, "promo_purchased", `Your promo code is ready. Tap copy to use it. ${existingCode.code}`);
          return json({ success: true, code: existingCode.code, user_id: purchase.user_id, duplicate: true });
        }

        let code = "";
        let attempts = 0;
        while (attempts < 20) {
          const randomNum = Math.floor(10000 + Math.random() * 90000);
          code = `PEF${randomNum}`;
          const { error: insErr } = await supabase.from("promo_codes").insert({
            user_id: purchase.user_id, purchase_id, code,
            is_activated: false, withdrawal_stage: "needs_activation",
          });
          if (!insErr) break;
          if (insErr.code !== "23505") throw insErr;
          attempts++;
          if (attempts >= 20) return json({ error: "This code already exists or has been used." }, 409);
        }
        await supabase.from("promo_purchases").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", purchase_id);
        await saveUserNotification(supabase, purchase.user_id, "promo_purchased", `Your promo code is ready. Tap copy to use it. ${code}`);
        return json({ success: true, code, user_id: purchase.user_id });
      }

      if (body.action === "activate_code") {
        const { code_id } = body;
        if (typeof code_id !== "string") return json({ error: "Invalid input" }, 400);
        const { error } = await supabase
          .from("promo_codes")
          .update({ is_activated: true, withdrawal_stage: "activated" })
          .eq("id", code_id);
        if (error) throw error;
        const { data: codeData } = await supabase
          .from("promo_codes")
          .select("*, promo_purchases(full_name, email, username)")
          .eq("id", code_id).single();
        return json({ success: true, data: codeData });
      }

      if (body.action === "approve_withdrawal") {
        const { withdrawal_id } = body;
        if (typeof withdrawal_id !== "string") return json({ error: "Invalid input" }, 400);
        const { data: withdrawal } = await supabase
          .from("withdrawal_requests").select("*").eq("id", withdrawal_id).single();
        if (withdrawal) {
          await supabase.from("withdrawal_requests")
            .update({ status: "approved" }).eq("id", withdrawal_id);
          if (withdrawal.promo_code_id) {
            await supabase.from("promo_codes")
              .update({ withdrawal_stage: "approved" })
              .eq("id", withdrawal.promo_code_id);
          }
        }
        return json({ success: true });
      }

      if (body.action === "clear_error") {
        const { code_id } = body;
        if (typeof code_id !== "string") return json({ error: "Invalid input" }, 400);
        const { error } = await supabase
          .from("promo_codes").update({ withdrawal_stage: "cleared" }).eq("id", code_id);
        if (error) throw error;
        return json({ success: true });
      }

      if (body.action === "update_payment_details") {
        const { account_number, account_name, bank_name, amount } = body;
        const { data: existing } = await supabase
          .from("payment_settings").select("id").eq("singleton", true).maybeSingle();
        const payload: any = {};
        if (typeof account_number === "string") payload.account_number = account_number.slice(0, 32);
        if (typeof account_name === "string") payload.account_name = account_name.slice(0, 128);
        if (typeof bank_name === "string") payload.bank_name = bank_name.slice(0, 128);
        if (typeof amount === "string") payload.amount = amount.slice(0, 16);
        if (existing) {
          const { error } = await supabase.from("payment_settings").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("payment_settings").insert({
            account_number: payload.account_number || "",
            account_name: payload.account_name || "",
            bank_name: payload.bank_name || "",
            amount: payload.amount || "7200",
          });
          if (error) throw error;
        }
        return json({ success: true });
      }

      if (body.action === "send_message") {
        const { user_id, message } = body;
        if (typeof user_id !== "string" || typeof message !== "string" || !message.trim()) {
          return json({ error: "Invalid input" }, 400);
        }
        const { error } = await supabase.from("chat_messages").insert({
          user_id, message: message.slice(0, 2000), sender_type: "support",
        });
        if (error) throw error;
        return json({ success: true });
      }

      if (body.action === "set_wallet_unlock") {
        const { user_id, unlocked } = body;
        if (typeof user_id !== "string" || typeof unlocked !== "boolean") {
          return json({ error: "Invalid input" }, 400);
        }
        const { error } = await supabase
          .from("user_app_state")
          .upsert({ user_id, wallet_unlocked: unlocked }, { onConflict: "user_id" });
        if (error) throw error;
        if (unlocked) {
          await supabase.from("user_notifications").insert({
            user_id,
            type: "wallet_unlock",
            message: "Congratulations 🎉 Your wallet has been unlocked. You can now view and copy your account details.",
          });
        }
        return json({ success: true });
      }

      if (body.action === "update_support_number") {
        const raw = typeof body.support_whatsapp === "string" ? body.support_whatsapp.replace(/[^0-9]/g, "") : "";
        if (raw.length < 10 || raw.length > 15) return json({ error: "Enter a valid WhatsApp number" }, 400);
        const { data: existing } = await supabase
          .from("app_settings").select("id").eq("singleton", true).maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("app_settings").update({ support_whatsapp: raw }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("app_settings").insert({ singleton: true, support_whatsapp: raw });
          if (error) throw error;
        }
        return json({ success: true, support_whatsapp: raw });
      }

      if (body.action === "create_master_code") {


        let code = "";
        let attempts = 0;
        while (attempts < 20) {
          const rand = Math.floor(10000 + Math.random() * 90000);
          code = `ADMIN${rand}`;
          const { error: insErr } = await supabase
            .from("admin_master_codes")
            .insert({ code });
          if (!insErr) break;
          if ((insErr as any).code !== "23505") throw insErr;
          attempts++;
        }
        return json({ success: true, code });
      }
    }

    if (req.method === "GET" && action === "app_stats") {
      // Real registered user count from auth
      let totalUsers = 0;
      let page = 1;
      while (page < 100) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        const batch = data?.users?.length || 0;
        totalUsers += batch;
        if (batch < 1000) break;
        page++;
      }
      const { count: purchaseCount } = await supabase
        .from("promo_purchases").select("id", { count: "exact", head: true }).eq("status", "verified");
      const { count: pendingCount } = await supabase
        .from("promo_purchases").select("id", { count: "exact", head: true }).eq("status", "pending");
      const { data: settings } = await supabase
        .from("app_settings").select("support_whatsapp").eq("singleton", true).maybeSingle();
      return json({
        total_users: totalUsers,
        verified_purchases: purchaseCount || 0,
        pending_purchases: pendingCount || 0,
        support_whatsapp: settings?.support_whatsapp || "",
      });
    }

    if (req.method === "GET" && action === "list_master_codes") {

      const { data, error } = await supabase
        .from("admin_master_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json(data || []);
    }

    if (req.method === "POST" && action === "delete_master_code") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.id !== "string") return json({ error: "Invalid input" }, 400);
      const { error } = await supabase.from("admin_master_codes").delete().eq("id", body.id);
      if (error) throw error;
      return json({ success: true });
    }


    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    return json({ error: err.message || "Server error" }, 500);
  }
});
