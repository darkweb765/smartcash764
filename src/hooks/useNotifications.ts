import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: "claim" | "withdrawal_success" | "withdrawal_pending" | "withdrawal_activate" | "promo_purchased" | "promo_activated";
  message: string;
  amount?: number;
  timestamp: number;
  read: boolean;
}

export const useNotifications = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      if (!nextUserId) setNotifications([]);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    const mapRow = (row: any): Notification => ({
      id: row.id,
      type: row.type,
      message: row.message,
      amount: row.amount == null ? undefined : Number(row.amount),
      timestamp: new Date(row.created_at).getTime(),
      read: Boolean(row.read),
    });

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("id, type, message, amount, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("Error loading notifications:", error);
        setNotifications([]);
        return;
      }
      setNotifications((data || []).map(mapRow));
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
        setNotifications((prev) => prev.some((n) => n.id === next.id) ? prev : [next, ...prev]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const next = mapRow(payload.new);
        setNotifications((prev) => prev.map((n) => n.id === next.id ? next : n));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
        if (data) {
          const next: Notification = {
            id: data.id,
            type: data.type as Notification["type"],
            message: data.message,
            amount: data.amount == null ? undefined : Number(data.amount),
            timestamp: new Date(data.created_at).getTime(),
            read: Boolean(data.read),
          };
          setNotifications((prev) => prev.some((n) => n.id === next.id) ? prev : [next, ...prev]);
        }
      });
  }, [userId]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (userId) supabase.from("user_notifications").update({ read: true }).eq("id", id).eq("user_id", userId).then();
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId) supabase.from("user_notifications").update({ read: true }).eq("user_id", userId).then();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
};
