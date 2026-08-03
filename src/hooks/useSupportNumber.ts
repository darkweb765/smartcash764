import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "smartpay_support_whatsapp";
export const DEFAULT_SUPPORT_NUMBER = "2349049242069";

const clean = (v: unknown) => String(v ?? "").replace(/[^0-9]/g, "");

const readCache = () => {
  try {
    const v = clean(localStorage.getItem(CACHE_KEY));
    return v.length >= 10 ? v : DEFAULT_SUPPORT_NUMBER;
  } catch {
    return DEFAULT_SUPPORT_NUMBER;
  }
};

/**
 * Support WhatsApp number, managed by the admin panel (app_settings table).
 * Cached locally so it still works offline, and kept in sync in realtime.
 */
export const useSupportNumber = () => {
  const [number, setNumber] = useState<string>(readCache);

  useEffect(() => {
    let mounted = true;

    const apply = (value: unknown) => {
      const v = clean(value);
      if (v.length < 10 || !mounted) return;
      setNumber(v);
      try { localStorage.setItem(CACHE_KEY, v); } catch {}
    };

    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("support_whatsapp")
          .eq("singleton", true)
          .maybeSingle();
        apply(data?.support_whatsapp);
      } catch {}
    })();


    const channel = supabase
      .channel("app-settings-support-number")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => apply(payload.new?.support_whatsapp)
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return number;
};

export default useSupportNumber;
