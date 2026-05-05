import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Plus, X, Camera, Image as ImageIcon, Paperclip, Loader2 } from "lucide-react";
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setMessages(data);
      } else {
        setMessages([{
          id: "welcome",
          message: "Hello! 👋 Welcome to Smart Pay Live Chat. How can we help you today?",
          image_url: null,
          sender_type: "support",
          created_at: new Date().toISOString(),
        }]);
      }
    };
    init();
  }, []);

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
          return [...prev.filter(m => m.id !== "welcome" || prev.length > 1), newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, imagePreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setShowAttachMenu(false);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large (max 10MB)");
      return;
    }
    setUploadError(null);
    setImageFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
    e.target.value = "";
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadError(null);
  };

  const handleSend = async () => {
    if (!userId) return;
    if (!input.trim() && !imageFile) return;
    setSending(true);
    setUploadError(null);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop() || "bin";
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("support-images")
          .upload(filePath, imageFile, { contentType: imageFile.type, upsert: false });

        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("support-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("chat_messages").insert({
        user_id: userId,
        message: input.trim() || (imageFile ? "📎 Attachment" : ""),
        image_url: imageUrl,
        sender_type: "user",
      });
      if (insertError) throw insertError;

      setInput("");
      setImageFile(null);
      setImagePreview(null);

      // Count prior user messages (excluding the one we just sent, which will arrive via realtime)
      const priorUserCount = messages.filter(m => m.sender_type === "user").length;
      // Check if support has ever replied beyond the initial welcome
      const supportHasReplied = messages.some(
        m => m.sender_type === "support" && m.id !== "welcome"
      );

      // Only auto-reply for the first 2 user messages, and stop once a real support reply exists
      if (!supportHasReplied && priorUserCount < 2) {
        const userText = (input.trim() || "").toLowerCase();
        const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|hola)\b/.test(userText);

        const replyMessage = priorUserCount === 0
          ? (isGreeting
              ? "Hi 👋 How can we help you today?"
              : "Hi 👋 How can we help you today?")
          : "Thanks! Our support team will reply to your message shortly.";

        setTimeout(async () => {
          await supabase.from("chat_messages").insert({
            user_id: userId,
            message: replyMessage,
            image_url: null,
            sender_type: "support",
          });
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Upload failed, try again");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col bg-muted relative">
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
              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                msg.sender_type === "user"
                  ? "bg-green-primary text-white rounded-br-md"
                  : "bg-card text-foreground border border-border rounded-bl-md"
              }`}
            >
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="Attachment"
                  className="rounded-lg mb-1.5 max-h-60 w-full object-cover"
                />
              )}
              {msg.message && (
                <p className="text-sm whitespace-pre-wrap px-1">{msg.message}</p>
              )}
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
      {(imagePreview || imageFile) && (
        <div className="px-4 pb-2 pt-2 bg-card border-t border-border">
          <div className="relative inline-block">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-24 rounded-lg border border-border object-cover" />
            ) : (
              <div className="h-16 px-4 flex items-center gap-2 bg-muted rounded-lg border border-border">
                <Paperclip className="w-4 h-4" />
                <span className="text-xs truncate max-w-[180px]">{imageFile?.name}</span>
              </div>
            )}
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="px-4 pb-1 text-xs text-red-500">{uploadError}</div>
      )}

      {/* Input */}
      <div className="px-3 pb-4 pt-2 bg-card border-t border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAttachMenu(true)}
            className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition"
            aria-label="Attach"
          >
            <Plus className="w-5 h-5 text-foreground" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 rounded-full border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-primary/50 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !imageFile) || sending}
            className="shrink-0 w-10 h-10 bg-green-primary rounded-full flex items-center justify-center disabled:opacity-50 transition"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />

      {/* Attachment Bottom Sheet */}
      {showAttachMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center animate-in fade-in"
          onClick={() => setShowAttachMenu(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-5" />
            <p className="text-sm font-semibold text-foreground mb-4 text-center">Attach</p>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-xs text-foreground">Camera</span>
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-xs text-foreground">Photos</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-green-primary/10 flex items-center justify-center">
                  <Paperclip className="w-6 h-6 text-green-primary" />
                </div>
                <span className="text-xs text-foreground">Files</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
