import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SupportMsg {
  id: string;
  message: string;
  created_at: string;
}

const SupportReplyPopup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<SupportMsg | null>(null);

  // Get current user
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Check pending unreplied support message
  const refresh = async (uid: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, message, sender_type, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = data?.[0];
    if (last && last.sender_type === "support") {
      setPending({ id: last.id, message: last.message, created_at: last.created_at });
    } else {
      setPending(null);
    }
  };

  useEffect(() => {
    if (!userId) { setPending(null); return; }
    refresh(userId);

    const channel = supabase
      .channel("support-popup-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const msg = payload.new;
        if (msg.sender_type === "support") {
          setPending({ id: msg.id, message: msg.message, created_at: msg.created_at });
        } else if (msg.sender_type === "user") {
          setPending(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Don't show on chat page itself
  if (!pending || location.pathname === "/live-chat") return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md animate-in slide-in-from-bottom duration-300">
      <div className="bg-card border border-green-primary/40 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-primary/15 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-green-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-primary mb-0.5">Smart Pay Support</p>
            <p className="text-sm text-foreground line-clamp-2 break-words">{pending.message}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/live-chat")}
          className="mt-3 w-full bg-green-primary text-white text-sm font-semibold rounded-full py-2.5 active:opacity-80 transition"
        >
          Reply to this message
        </button>
      </div>
    </div>
  );
};

export default SupportReplyPopup;
