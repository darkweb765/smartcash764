import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SupportMsg {
  id: string;
  message: string;
  created_at: string;
}

const SupportReplyPopup = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  if (!pending || !userId || location.pathname === "/live-chat") return null;

  const handleReply = () => {
    setPending(null);
    navigate("/live-chat");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-green-primary/40 rounded-2xl shadow-2xl p-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-green-primary/15 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-green-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-primary mb-1">Smart Pay Support</p>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{pending.message}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 mb-3">
          Please reply in live chat to continue using the app.
        </p>

        <button
          onClick={handleReply}
          className="w-full bg-green-primary text-white text-sm font-semibold rounded-full py-3 active:opacity-80 transition flex items-center justify-center gap-2"
        >
          Reply in Live Chat <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SupportReplyPopup;
