import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useBalance } from "@/hooks/useBalance";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AppContextType {
  balance: number;
  isClaimed: boolean;
  isAnimating: boolean;
  claimGift: () => Promise<boolean>;
  deductBalance: (amount: number) => void;
  notifications: Notification[];
  addNotification: (type: Notification["type"], message: string, amount?: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const balanceHook = useBalance();
  const notificationsHook = useNotifications();
  const { addNotification } = notificationsHook;

  // Global realtime listener: fires when admin verifies/activates the user's promo
  useEffect(() => {
    let channel: any;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const saveNotification = async (type: Notification["type"], message: string, amount?: number) => {
        await supabase.from("user_notifications").insert({ user_id: user.id, type, message, amount: amount ?? null });
      };

      // Backfill: ensure every existing promo code has a notification entry
      try {
        const { data: codes } = await supabase
          .from("promo_codes")
          .select("code, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (codes && codes.length) {
          const { data: existingNotifications } = await supabase
            .from("user_notifications")
            .select("message")
            .eq("user_id", user.id)
            .eq("type", "promo_purchased");
          const have = new Set(
            (existingNotifications || [])
              .map((n: any) => {
                const m = String(n.message || "").match(/PEF\d{5}/);
                return m ? m[0] : null;
              })
              .filter(Boolean)
          );
          for (const row of codes) {
            if (!have.has(row.code)) {
              await saveNotification("promo_purchased", `Your promo code is ready. Tap copy to use it. ${row.code}`);
            }
          }
        }
      } catch {}



      channel = supabase
        .channel("user-promo-status-" + user.id)
        // New promo code = admin verified payment
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "promo_codes",
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          const code = payload.new?.code;
          if (!code) return;
          // Persist 4-hour confirmation window so BuyPromo shows "Confirmed" on next open
          try {
            localStorage.setItem(
              "smartpay_payment_confirmed",
              JSON.stringify({ code, at: Date.now() })
            );
          } catch {}
          saveNotification("promo_purchased", `Your promo code is ready. Tap copy to use it. ${code}`);
          toast({ title: "Payment Confirmed Successfully 🎉", description: `Your promo code: ${code}` });
        })
        // Stage update = activated/approved/cleared
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "promo_codes",
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          const stage = payload.new?.withdrawal_stage;
          if (stage === "activated") {
            addNotification("promo_activated", "Your promo code is now activated 🎉");
            toast({ title: "Code Activated", description: "You can now proceed with withdrawal." });
          } else if (stage === "approved") {
            addNotification("withdrawal_success", "Withdrawal approved by admin ✅");
            toast({ title: "Withdrawal Approved" });
          } else if (stage === "cleared") {
            addNotification("withdrawal_success", "Error cleared — withdrawal is processing");
            toast({ title: "Cleared", description: "Withdrawal is processing." });
          }
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [addNotification]);

  return (
    <AppContext.Provider
      value={{
        ...balanceHook,
        ...notificationsHook,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
