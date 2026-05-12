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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!JWT_SECRET) return json({ error: "Server misconfigured" }, 500);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  // Public actions: no admin token required (each validates user/input itself)
  const publicActions = new Set([
    "admin_login", "admin_register", "admin_status",
    "get_payment_details", "verify_service_code",
    "verify_admin_withdraw_pin",
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

    // ---------- ADMIN-ONLY ENDPOINTS ----------

    if (req.method === "GET" && action === "pending_purchases") {
      const { data, error } = await supabase
        .from("promo_purchases").select("*").eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "GET" && action === "all_purchases") {
      const { data, error } = await supabase
        .from("promo_purchases").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
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
      const { data, error } = await supabase
        .from("chat_messages").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const userMap: Record<string, any> = {};
      for (const msg of (data || [])) {
        if (!userMap[msg.user_id]) userMap[msg.user_id] = msg;
      }
      const userIds = Object.keys(userMap);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles").select("*").in("user_id", userIds);
        profiles = pData || [];
      }
      const conversations = userIds.map((uid) => {
        const profile = profiles.find((p: any) => p.user_id === uid);
        const lastMsg = userMap[uid];
        return {
          user_id: uid,
          username: profile?.username || "User",
          email: "",
          last_message: lastMsg.message,
          last_message_time: lastMsg.created_at,
          sender_type: lastMsg.sender_type,
        };
      });
      for (const conv of conversations) {
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
          .from("promo_codes").select("code").eq("user_id", purchase.user_id).maybeSingle();
        if (existingCode) {
          await supabase.from("promo_purchases").update({ status: "verified" }).eq("id", purchase_id);
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
        await supabase.from("promo_purchases").update({ status: "verified" }).eq("id", purchase_id);
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
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    return json({ error: err.message || "Server error" }, 500);
  }
});
