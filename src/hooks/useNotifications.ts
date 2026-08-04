import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type:
    | "claim"
    | "withdrawal_success"
    | "withdrawal_pending"
    | "withdrawal_activate"
    | "promo_purchased"
    | "promo_activated"
    | "wallet_unlock"
    | "bank_credit"
    | "bank_debit";
  message: string;
  amount?: number;
  timestamp: number;
  read: boolean;
  meta?: Record<string, any>;
}

const mapRow = (row: any): Notification => ({
  id: row.id,
  type: row.type as Notification["type"],
  message: row.message,
  amount: row.amount == null ? undefined : Number(row.amount),
  timestamp: new Date(row.created_at).getTime(),
  read: Boolean(row.read),
  meta: (row.meta || undefined) as Record<string, any> | undefined,
});


export const useNotifications = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const mountedRef = useRef(true);

  // Safe setter — never updates after unmount
  const safeSetNotifications = useCallback(
    (updater: Notification[] | ((prev: Notification[]) => Notification[])) => {
      if (!mountedRef.current) return;
      setNotifications(updater as any);
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (mountedRef.current) setUserId(user?.id ?? null);
      })
      .catch((err) => console.error("useNotifications getUser failed:", err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      if (!nextUserId) setNotifications([]);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("user_notifications")
          .select("id, type, message, amount, read, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (cancelled || !mountedRef.current) return;
        if (error) {
          console.error("Error loading notifications:", error);
          safeSetNotifications([]);
          return;
        }
        safeSetNotifications((data || []).map(mapRow));
      } catch (err) {
        console.error("loadNotifications threw:", err);
      }
    };

    loadNotifications();

    const channel = supabase
      .channel("user-notifications-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const next = mapRow(payload.new);
        safeSetNotifications((prev) => prev.some((n) => n.id === next.id) ? prev : [next, ...prev]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const next = mapRow(payload.new);
        safeSetNotifications((prev) => prev.map((n) => n.id === next.id ? next : n));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, safeSetNotifications]);

  const addNotification = useCallback((
    type: Notification["type"],
    message: string,
    amount?: number
  ) => {
    if (!userId) return;

    supabase
      .from("user_notifications")
      .insert({ user_id: userId, type, message, amount: amount ?? null })
      .select("id, type, message, amount, read, created_at")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error saving notification:", error);
          return;
        }
        if (data && mountedRef.current) {
          const next = mapRow(data);
          safeSetNotifications((prev) => prev.some((n) => n.id === next.id) ? prev : [next, ...prev]);
        }
      }, (err) => console.error("addNotification rejected:", err));
  }, [userId, safeSetNotifications]);

  const markAsRead = useCallback((id: string) => {
    safeSetNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (userId) {
      supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", userId)
        .then(
          () => {},
          (err) => console.error("markAsRead rejected:", err)
        );
    }
  }, [userId, safeSetNotifications]);

  const markAllAsRead = useCallback(() => {
    safeSetNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId) {
      supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .then(
          () => {},
          (err) => console.error("markAllAsRead rejected:", err)
        );
    }
  }, [userId, safeSetNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
};
