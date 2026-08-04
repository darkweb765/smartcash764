import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TARGET_BALANCE = 150000;
const cacheKey = (uid: string) => `smartpay_balance_cache_${uid}`;

const readCache = (uid: string): { balance: number; isClaimed: boolean } | null => {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      balance: Number(parsed.balance || 0),
      isClaimed: Boolean(parsed.isClaimed),
    };
  } catch {
    return null;
  }
};

const writeCache = (uid: string, balance: number, isClaimed: boolean) => {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify({ balance, isClaimed }));
  } catch {}
};

export const useBalance = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      const uid = user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const cached = readCache(uid);
        if (cached) {
          setBalance(cached.balance);
          setIsClaimed(cached.isClaimed);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      if (!nextUserId) {
        setBalance(0);
        setIsClaimed(false);
        setIsAnimating(false);
      } else {
        const cached = readCache(nextUserId);
        if (cached) {
          setBalance(cached.balance);
          setIsClaimed(cached.isClaimed);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from("user_app_state")
        .select("balance, gift_claimed")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading app state:", error);
        return;
      }

      if (!data) {
        await supabase.from("user_app_state").upsert({ user_id: userId, balance: 0, gift_claimed: false });
        if (!cancelled) {
          setBalance(0);
          setIsClaimed(false);
          writeCache(userId, 0, false);
        }
        return;
      }

      const nextBalance = Number(data.balance || 0);
      const nextClaimed = Boolean(data.gift_claimed);
      setBalance(nextBalance);
      setIsClaimed(nextClaimed);
      writeCache(userId, nextBalance, nextClaimed);
    };

    loadState();

    // Live updates: admin credits/debits reflect instantly without refresh
    const channel = supabase
      .channel("user-app-state-" + userId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_app_state",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (cancelled) return;
          const nextBalance = Number(payload.new?.balance || 0);
          const nextClaimed = Boolean(payload.new?.gift_claimed);
          setBalance(nextBalance);
          setIsClaimed(nextClaimed);
          writeCache(userId, nextBalance, nextClaimed);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);


  const persistState = useCallback(async (nextBalance: number, nextClaimed: boolean) => {
    if (!userId) return;
    writeCache(userId, nextBalance, nextClaimed);
    const { error } = await supabase
      .from("user_app_state")
      .upsert({ user_id: userId, balance: nextBalance, gift_claimed: nextClaimed }, { onConflict: "user_id" });
    if (error) console.error("Error saving app state:", error);
  }, [userId]);

  const claimGift = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isClaimed || isAnimating || balance > 0) {
        resolve(false);
        return;
      }

      setIsAnimating(true);

      const duration = 2500;
      const steps = 60;
      const increment = TARGET_BALANCE / steps;
      const intervalTime = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const newBalance = Math.min(Math.round(increment * currentStep), TARGET_BALANCE);
        setBalance(newBalance);

        if (currentStep >= steps) {
          clearInterval(interval);
          setBalance(TARGET_BALANCE);
          setIsClaimed(true);
          setIsAnimating(false);
          persistState(TARGET_BALANCE, true);
          resolve(true);
        }
      }, intervalTime);
    });
  }, [isClaimed, isAnimating, balance, persistState]);

  const deductBalance = useCallback((amount: number) => {
    setBalance((prev) => {
      const next = Math.max(0, prev - amount);
      const nextClaimed = next === 0 ? false : isClaimed;
      if (next === 0) setIsClaimed(false);
      persistState(next, nextClaimed);
      return next;
    });
  }, [isClaimed, persistState]);

  return {
    balance,
    isClaimed,
    isAnimating,
    claimGift,
    deductBalance,
  };
};
