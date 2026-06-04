import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TARGET_BALANCE = 150000;

export const useBalance = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      if (!nextUserId) {
        setBalance(0);
        setIsClaimed(false);
        setIsAnimating(false);
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
      }

      if (!data) {
        await supabase.from("user_app_state").upsert({ user_id: userId, balance: 0, gift_claimed: false });
        if (!cancelled) {
          setBalance(0);
          setIsClaimed(false);
        }
        return;
      }

      setBalance(Number(data.balance || 0));
      setIsClaimed(Boolean(data.gift_claimed));
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persistState = useCallback(async (nextBalance: number, nextClaimed: boolean) => {
    if (!userId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    // Immediate write so reopening the app always shows the latest balance.
    const { error } = await supabase
      .from("user_app_state")
      .upsert({ user_id: userId, balance: nextBalance, gift_claimed: nextClaimed }, { onConflict: "user_id" });
    if (error) console.error("Error saving app state:", error);
  }, [userId]);

  const claimGift = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // Block re-claim while a balance is still on the dashboard.
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
      // Once the balance is fully withdrawn, allow the user to claim again.
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
