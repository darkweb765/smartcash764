import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = Deno.env.get("ADMIN_ACCESS_CODE") || "351710";
const PAYMENT_ACCOUNT_NUMBER = Deno.env.get("PAYMENT_ACCOUNT_NUMBER") || "5227367627";
const PAYMENT_BANK_NAME = Deno.env.get("PAYMENT_BANK_NAME") || "Moniepoint MFB";
const PAYMENT_ACCOUNT_NAME = Deno.env.get("PAYMENT_ACCOUNT_NAME") || "Oluebube Jude Olimba";
const PAYMENT_AMOUNT = Deno.env.get("PAYMENT_AMOUNT") || "7200";
const SERVICE_VERIFICATION_CODE = Deno.env.get("SERVICE_VERIFICATION_CODE") || "3517";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Public actions that don't need admin code
  const publicActions = ["validate_admin_code", "get_payment_details", "verify_service_code"];
  
  const adminCode = req.headers.get("x-admin-code");
  
  if (!publicActions.includes(action || "") && adminCode !== ADMIN_CODE) {
    return new Response(JSON.stringify({ error: "Access Denied" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Validate admin access code (no code exposed to frontend)
    if (req.method === "POST" && action === "validate_admin_code") {
      const body = await req.json();
      const isValid = body.code === ADMIN_CODE;
      if (isValid) {
        // Generate a short-lived token (simple hash for session)
        const token = crypto.randomUUID();
        return new Response(JSON.stringify({ valid: true, token }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get payment account details (requires authenticated user)
    if (req.method === "GET" && action === "get_payment_details") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        account_number: PAYMENT_ACCOUNT_NUMBER,
        bank_name: PAYMENT_BANK_NAME,
        account_name: PAYMENT_ACCOUNT_NAME,
        amount: PAYMENT_AMOUNT,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify service code (for airtime, data, etc.)
    if (req.method === "POST" && action === "verify_service_code") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const isValid = body.code === SERVICE_VERIFICATION_CODE;
      return new Response(JSON.stringify({ valid: isValid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate admin promo bypass for withdrawals
    if (req.method === "POST" && action === "validate_admin_promo") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const isValid = body.code === `ADMIN-${ADMIN_CODE}`;
      return new Response(JSON.stringify({ valid: isValid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET pending purchases
    if (req.method === "GET" && action === "pending_purchases") {
      const { data, error } = await supabase
        .from("promo_purchases")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET all purchases
    if (req.method === "GET" && action === "all_purchases") {
      const { data, error } = await supabase
        .from("promo_purchases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET codes needing activation
    if (req.method === "GET" && action === "pending_activations") {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*, promo_purchases(full_name, email, username)")
        .eq("is_activated", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET pending withdrawals
    if (req.method === "GET" && action === "pending_withdrawals") {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, promo_codes(code, promo_purchases(full_name, email, username))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET all alerts
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

      return new Response(JSON.stringify({ codes: codes || [], withdrawals: withdrawals || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET chat conversations
    if (req.method === "GET" && action === "chat_conversations") {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userMap: Record<string, any> = {};
      for (const msg of (data || [])) {
        if (!userMap[msg.user_id]) {
          userMap[msg.user_id] = msg;
        }
      }

      const userIds = Object.keys(userMap);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds);
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
          .from("promo_purchases")
          .select("email")
          .eq("user_id", conv.user_id)
          .limit(1);
        if (pp && pp.length > 0) conv.email = pp[0].email;
      }

      return new Response(JSON.stringify(conversations), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET chat messages for a specific user
    if (req.method === "GET" && action === "chat_messages") {
      const userId = url.searchParams.get("user_id");
      if (!userId) throw new Error("user_id required");
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET reports
    if (req.method === "GET" && action === "reports") {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((tickets || []).map((t: any) => t.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds);
        profiles = pData || [];
      }

      const enriched = (tickets || []).map((t: any) => {
        const profile = profiles.find((p: any) => p.user_id === t.user_id);
        return { ...t, username: profile?.username || "User" };
      });

      for (const t of enriched) {
        const { data: pp } = await supabase
          .from("promo_purchases")
          .select("email")
          .eq("user_id", t.user_id)
          .limit(1);
        if (pp && pp.length > 0) t.email = pp[0].email;
        else t.email = "unknown@email.com";
      }

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();

      // Verify payment
      if (body.action === "verify_payment") {
        const { purchase_id } = body;
        const { data: purchase, error: pErr } = await supabase
          .from("promo_purchases")
          .select("*")
          .eq("id", purchase_id)
          .single();
        if (pErr) throw pErr;

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const code = `INST-${randomNum}-SP`;

        await supabase
          .from("promo_purchases")
          .update({ status: "verified" })
          .eq("id", purchase_id);

        const { error: cErr } = await supabase.from("promo_codes").insert({
          user_id: purchase.user_id,
          purchase_id: purchase_id,
          code: code,
          is_activated: false,
          withdrawal_stage: "needs_activation",
        });
        if (cErr) throw cErr;

        return new Response(
          JSON.stringify({ success: true, code, user_id: purchase.user_id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Activate code
      if (body.action === "activate_code") {
        const { code_id } = body;
        const { error } = await supabase
          .from("promo_codes")
          .update({ is_activated: true, withdrawal_stage: "activated" })
          .eq("id", code_id);
        if (error) throw error;

        const { data: codeData } = await supabase
          .from("promo_codes")
          .select("*, promo_purchases(full_name, email, username)")
          .eq("id", code_id)
          .single();

        return new Response(
          JSON.stringify({ success: true, data: codeData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Approve withdrawal
      if (body.action === "approve_withdrawal") {
        const { withdrawal_id } = body;
        const { data: withdrawal } = await supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("id", withdrawal_id)
          .single();

        if (withdrawal) {
          await supabase
            .from("withdrawal_requests")
            .update({ status: "approved" })
            .eq("id", withdrawal_id);

          if (withdrawal.promo_code_id) {
            await supabase
              .from("promo_codes")
              .update({ withdrawal_stage: "approved" })
              .eq("id", withdrawal.promo_code_id);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear error
      if (body.action === "clear_error") {
        const { code_id } = body;
        const { error } = await supabase
          .from("promo_codes")
          .update({ withdrawal_stage: "cleared" })
          .eq("id", code_id);
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Admin send chat message
      if (body.action === "send_message") {
        const { user_id, message } = body;
        const { error } = await supabase.from("chat_messages").insert({
          user_id,
          message,
          sender_type: "support",
        });
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
