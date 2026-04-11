import { supabase } from "@/integrations/supabase/client";

export const verifyServiceCode = async (code: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/admin-actions?action=verify_service_code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ code }),
      }
    );
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
};
