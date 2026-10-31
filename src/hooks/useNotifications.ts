import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { onAppReturn } from "@/lib/backendWarmup";

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

const MAX_CACHED = 60;
const cacheKey = (uid: string) => `smartpay_notifications_cache_${uid}`;

const readCache = (uid: string): Notification[] => {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCache = (uid: string, list: Notification[]) => {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(list.slice(0, MAX_CACHED)));
  } catch {}
};

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

    // Local read (no network): instant even when the backend is waking up.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mountedRef.current) setUserId(session?.user?.id ?? null);
    });

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

    // Show the cached list immediately so the page opens instantly,
    // then refresh from the database in the background.
    const cached = readCache(userId);
    if (cached.length) safeSetNotifications(cached);

    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("user_notifications")
          .select("id, type, message, amount, read, created_at, meta")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(MAX_CACHED);

        if (cancelled || !mountedRef.current) return;
        if (error) {
          console.error("Error loading notifications:", error);
          safeSetNotifications((prev) => (prev.length ? prev : []));
          return;
        }
        const next = (data || []).map(mapRow);
        safeSetNotifications(next);
        writeCache(userId, next);
      } catch (err) {
        console.error("loadNotifications threw:", err);
      }
    };

    // Loads now and re-syncs whenever the user comes back to the app,
    // so a sleeping backend never blocks or leaves stale lists.
    const stop = onAppReturn(loadNotifications);

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
      stop();
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
      .select("id, type, message, amount, read, created_at, meta")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error saving notification:", error);
          return;
        }
        if (data && mountedRef.current) {
          const next = mapRow(data);
          safeSetNotifications((prev) => {
            const merged = prev.some((n) => n.id === next.id) ? prev : [next, ...prev];
            writeCache(userId, merged);
            return merged;
          });
        }
      }, (err) => console.error("addNotification rejected:", err));
  }, [userId, safeSetNotifications]);

  const markAsRead = useCallback((id: string) => {
    safeSetNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (userId) writeCache(userId, next);
      return next;
    });
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
    safeSetNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      if (userId) writeCache(userId, next);
      return next;
    });
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
