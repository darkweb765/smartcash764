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

    // GET all purchases (verified)
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

    if (req.method === "POST") {
      const body = await req.json();

      // Verify payment → generate unique promo code
      if (body.action === "verify_payment") {
        const { purchase_id } = body;

        // Get purchase
        const { data: purchase, error: pErr } = await supabase
          .from("promo_purchases")
          .select("*")
          .eq("id", purchase_id)
          .single();
        if (pErr) throw pErr;

        // Generate unique code
        const code = `PRO-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        // Update purchase status
        await supabase
          .from("promo_purchases")
          .update({ status: "verified" })
          .eq("id", purchase_id);

        // Create promo code
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

        // Get code details for response
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
