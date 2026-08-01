import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentDetails = {
  account_number: string;
  bank_name: string;
  account_name: string;
  amount: string;
};

// SAFETY BLOCKLIST — never display these deprecated accounts, ever.
const BLOCKED_ACCOUNTS: Array<{ number?: string; name?: string; bank?: string }> = [
  { number: "8985834623", name: "VICTOR NNAMDI", bank: "PALMPAY" },
];

export const isBlockedAccount = (
  d: { account_number?: string; account_name?: string; bank_name?: string } | null,
) => {
  if (!d) return false;
  const norm = (s?: string) => (s || "").toUpperCase().replace(/\s+/g, " ").trim();
  const num = (d.account_number || "").replace(/\D/g, "");
  const name = norm(d.account_name);
  const bank = norm(d.bank_name);
  return BLOCKED_ACCOUNTS.some(
    (b) =>
      (b.number && num === b.number) ||
      (b.name && name.includes(b.name)) ||
      (b.bank && bank.includes(b.bank) && b.number && num === b.number),
  );
};

export const PAYMENT_CACHE_KEY = "smartpay_active_payment_account_v1";

export const readCachedPayment = (): PaymentDetails | null => {
  try {
    const raw = localStorage.getItem(PAYMENT_CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.account_number || !d.bank_name || !d.account_name) return null;
    if (isBlockedAccount(d)) {
      localStorage.removeItem(PAYMENT_CACHE_KEY);
      return null;
    }
    return d as PaymentDetails;
  } catch {
    return null;
  }
};

export const writeCachedPayment = (d: PaymentDetails) => {
  try {
    localStorage.setItem(PAYMENT_CACHE_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
};

export const normalizePaymentDetails = (data: any): PaymentDetails => {
  const clean = {
    account_number: String(data?.account_number || "").trim(),
    bank_name: String(data?.bank_name || "").trim(),
    account_name: String(data?.account_name || "").trim(),
    amount: String(data?.amount || "7200").trim(),
  };
  if (!clean.account_number || !clean.bank_name || !clean.account_name) {
    throw new Error("Incomplete payment details");
  }
  if (isBlockedAccount(clean)) {
    throw new Error("Blocked deprecated account returned");
  }
  return clean;
};

const getPaymentFromDatabase = async (): Promise<PaymentDetails> => {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("account_number, bank_name, account_name, amount")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  return normalizePaymentDetails(data);
};

/**
 * Loads the active company payment account.
 * - Shows the last cached valid account instantly (slow / offline network).
 * - Refreshes from the server whenever connectivity returns.
 * - Applies admin changes instantly through the payment_settings realtime channel.
 */
export const usePaymentAccount = (active: boolean) => {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const apply = useCallback((details: PaymentDetails) => {
    writeCachedPayment(details);
    if (!mounted.current) return;
    setPaymentDetails(details);
    setPaymentError(null);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const cached = readCachedPayment();
      if (cached) {
        if (mounted.current) {
          setPaymentDetails(cached);
          setPaymentError(null);
        }
        return;
      }
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-actions?action=get_payment_details&_ts=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || ""}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      apply(normalizePaymentDetails(await res.json()));
    } catch (e) {
      console.error("Error fetching payment details:", e);
      try {
        apply(await getPaymentFromDatabase());
        return;
      } catch (directError) {
        console.error("Error fetching payment details directly:", directError);
      }
      const cached = readCachedPayment();
      if (!mounted.current) return;
      if (cached) {
        setPaymentDetails(cached);
        setPaymentError(null);
      } else {
        setPaymentDetails(null);
        setPaymentError(
          "Unable to load payment details. Please check your internet connection and try again.",
        );
      }
    }
  }, [apply]);

  // Preload cache + fetch when the account screen becomes active.
  useEffect(() => {
    if (!active) return;
    const cached = readCachedPayment();
    if (cached) {
      setPaymentDetails(cached);
      setPaymentError(null);
    } else {
      setPaymentDetails(null);
    }
    fetchDetails();
  }, [active, fetchDetails]);

  // Refresh from server the moment connectivity returns.
  useEffect(() => {
    const onOnline = () => { fetchDetails(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [fetchDetails]);

  // Realtime: apply admin changes instantly.
  useEffect(() => {
    const ch = supabase
      .channel("buy-promo-payment-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_settings" },
        (payload: any) => {
          try {
            // Use the row from the event so the new account shows instantly,
            // even if the network round-trip is slow.
            apply(normalizePaymentDetails(payload?.new));
          } catch {
            /* incomplete/blocked payload — fall back to a fetch */
          }
          fetchDetails();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [apply, fetchDetails]);

  return { paymentDetails, paymentError, fetchDetails };
};
