import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SupportMsg {
  id: string;
  message: string;
  created_at: string;
}

const SupportReplyPopup = () => {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<SupportMsg | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSend = async () => {
    if (!reply.trim() || !userId) return;
    setSending(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("chat_messages").insert({
        user_id: userId,
        message: reply.trim(),
        image_url: null,
        sender_type: "user",
      });
      if (insertError) throw insertError;
      setReply("");
      setPending(null);
    } catch (err: any) {
      setError(err?.message || "Failed to send. Try again.");
    } finally {
      setSending(false);
    }
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

        <p className="text-xs text-muted-foreground mt-4 mb-2">
          Please reply to continue using the app.
        </p>

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply..."
          rows={3}
          autoFocus
          className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-primary/50 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        <button
          onClick={handleSend}
          disabled={!reply.trim() || sending}
          className="mt-3 w-full bg-green-primary text-white text-sm font-semibold rounded-full py-3 active:opacity-80 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4" /> Send Reply</>
          )}
        </button>
      </div>
    </div>
  );
};

export default SupportReplyPopup;
