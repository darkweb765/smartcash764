import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  message: string;
  image_url: string | null;
  sender_type: string;
  created_at: string;
}

const LiveChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch existing messages
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);

      // Auto welcome message if no messages
      if (!data || data.length === 0) {
        const welcomeMsg: ChatMessage = {
          id: "welcome",
          message: "Hello! 👋 Welcome to Smart Pay Live Chat. How can we help you today? Please type your message below.",
          image_url: null,
          sender_type: "support",
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
      }
    };
    init();
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("chat-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if (!input.trim()) return; // Message is compulsory
    if (!userId) return;
    setSending(true);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("support-images")
          .upload(filePath, imageFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("support-images")
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      await supabase.from("chat_messages").insert({
        user_id: userId,
        message: input.trim(),
        image_url: imageUrl,
        sender_type: "user",
      });

      setInput("");
      setImageFile(null);
      setImagePreview(null);

      // Auto-reply after a short delay
      setTimeout(async () => {
        const autoReply: ChatMessage = {
          id: "auto-" + Date.now(),
          message: "Thank you for your message! Our support team has been notified and will respond shortly. If your issue is urgent, please call us at +234 915 530 6297.",
          image_url: null,
          sender_type: "support",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, autoReply]);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col bg-muted">
      {/* Header */}
      <div className="bg-green-primary text-white px-4 pt-4 pb-4 rounded-b-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-base">Smart Pay Support</p>
            <p className="text-xs text-white/70">Online • Usually replies instantly</p>
          </div>
          <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.sender_type === "user"
                  ? "bg-green-primary text-white rounded-br-md"
                  : "bg-card text-foreground border border-border rounded-bl-md"
              }`}
            >
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="Attachment"
                  className="rounded-lg mb-2 max-h-40 w-full object-cover"
                />
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              <p className={`text-[10px] mt-1 text-right ${
                msg.sender_type === "user" ? "text-white/60" : "text-muted-foreground"
              }`}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-border" />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {!input.trim() && (
            <p className="text-xs text-red-500 mt-1">Please write a message before sending an image.</p>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 bg-card border-t border-border">
        <div className="flex items-end gap-2">
          <label className="cursor-pointer shrink-0 p-2">
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-primary/50 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 bg-green-primary rounded-full flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;
