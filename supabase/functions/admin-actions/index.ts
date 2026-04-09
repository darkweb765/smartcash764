import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = "351710";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminCode = req.headers.get("x-admin-code");
  if (adminCode !== ADMIN_CODE) {
    return new Response(JSON.stringify({ error: "Access Denied" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
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

    // GET all alerts (verified codes + withdrawals)
    if (req.method === "GET" && action === "alerts") {
      const { data: codes, error: cErr } = await supabase
        .from("promo_codes")
        .select("*, promo_purchases(full_name, email, username)")
        .order("created_at", { ascending: false });
      if (cErr) throw cErr;

      const { data: withdrawals, error: wErr } = await supabase
        .from("withdrawal_requests")
        .select("*, promo_codes(code, promo_purchases(full_name, email, username))")
        .order("created_at", { ascending: false });
      if (wErr) throw wErr;

      return new Response(JSON.stringify({ codes: codes || [], withdrawals: withdrawals || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET all chat conversations (grouped by user)
    if (req.method === "GET" && action === "chat_conversations") {
      // Get all unique user_ids with their latest message
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by user_id, get latest message per user
      const userMap: Record<string, any> = {};
      for (const msg of (data || [])) {
        if (!userMap[msg.user_id]) {
          userMap[msg.user_id] = msg;
        }
      }

      // Get profiles for these users
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

      // Get emails from auth - try promo_purchases as fallback
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

    // GET support tickets (reports)
    if (req.method === "GET" && action === "reports") {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get profiles
      const userIds = [...new Set((tickets || []).map((t: any) => t.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds);
        profiles = pData || [];
      }

      // Get emails from promo_purchases
      const enriched = (tickets || []).map((t: any) => {
        const profile = profiles.find((p: any) => p.user_id === t.user_id);
        return { ...t, username: profile?.username || "User" };
      });

      // Get emails
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

      // Verify payment → generate unique promo code
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
          .update({ is_activated: true })
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
        const { error } = await supabase
          .from("withdrawal_requests")
          .update({ status: "approved" })
          .eq("id", withdrawal_id);
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
