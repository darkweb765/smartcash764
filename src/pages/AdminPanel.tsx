import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type Tab = "users" | "alerts" | "livechat" | "reports";

interface Purchase {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  status: string;
  created_at: string;
}

interface AlertItem {
  type: "activation" | "withdrawal";
  id: string;
  name: string;
  message: string;
  date: string;
  status: string;
  code_id?: string;
  withdrawal_stage?: string;
}

interface Conversation {
  user_id: string;
  username: string;
  email: string;
  last_message: string;
  last_message_time: string;
}

interface ChatMessage {
  id: string;
  message: string;
  image_url: string | null;
  sender_type: string;
  created_at: string;
}

interface Report {
  id: string;
  user_id: string;
  username: string;
  email: string;
  message: string;
  image_url: string | null;
  status: string;
  created_at: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  // Chat state
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [activeChatName, setActiveChatName] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: string; id: string; label: string }>({
    open: false, type: "", id: "", label: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const adminCode = localStorage.getItem("admin_access_code");

  const callAdmin = async (method: string, action: string, body?: any, extraParams?: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/admin-actions?action=${action}${extraParams || ""}`;
    const opts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-code": adminCode || "",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "users") {
        const data = await callAdmin("GET", "all_purchases");
        setPurchases(Array.isArray(data) ? data : []);
      } else if (tab === "alerts") {
        const data = await callAdmin("GET", "alerts");
        const items: AlertItem[] = [];
        // Withdrawals
        for (const w of (data.withdrawals || [])) {
          const name = w.promo_codes?.promo_purchases?.full_name || "User";
          const stage = w.promo_codes?.withdrawal_stage || "needs_activation";
          let message = `${name} has requested a withdrawal of ₦${w.amount}.`;
          if (stage === "needs_approval") message += " Waiting for approval payment (₦17,500).";
          else if (stage === "needs_clearing") message += " Withdrawal reversed. Waiting for error clearing payment (₦25,500).";
          else message += " Click to approve.";
          items.push({
            type: "withdrawal",
            id: w.id,
            name,
            message,
            date: w.created_at,
            status: w.status,
            code_id: w.promo_code_id,
            withdrawal_stage: stage,
          });
        }
        // Codes needing activation
        for (const c of (data.codes || [])) {
          const name = c.promo_purchases?.full_name || "User";
          const stage = c.withdrawal_stage || "needs_activation";
          let statusVal = "pending";
          if (c.is_activated && stage !== "needs_clearing") statusVal = "done";
          items.push({
            type: "activation",
            id: c.id,
            name,
            message: c.is_activated 
              ? `${name}'s promo code is activated. Stage: ${stage}`
              : `${name}'s payment has been verified. Click to activate their promo code.`,
            date: c.created_at,
            status: statusVal,
            code_id: c.id,
            withdrawal_stage: stage,
          });
        }
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAlerts(items);
        setAlertCount(items.filter(i => i.status === "pending" || i.withdrawal_stage === "needs_approval" || i.withdrawal_stage === "needs_clearing").length);
      } else if (tab === "livechat") {
        const data = await callAdmin("GET", "chat_conversations");
        setConversations(Array.isArray(data) ? data : []);
      } else if (tab === "reports") {
        const data = await callAdmin("GET", "reports");
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  // Fetch alert count on mount
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const data = await callAdmin("GET", "alerts");
        const pending = [
          ...(data.withdrawals || []).filter((w: any) => w.status === "pending"),
          ...(data.codes || []).filter((c: any) => !c.is_activated),
        ];
        setAlertCount(pending.length);
      } catch {}
    };
    fetchAlertCount();
  }, []);

  const handleVerify = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "verify_payment", purchase_id: id });
    if (res.success) {
      setSuccessMsg(`Payment Verified!\nPromo Code: ${res.code}`);
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleActivate = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "activate_code", code_id: id });
    if (res.success) {
      setSuccessMsg("Promo Code Activated!");
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "approve_withdrawal", withdrawal_id: id });
    if (res.success) {
      setSuccessMsg("Withdrawal Approved!");
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleClearError = async (codeId: string) => {
    const res = await callAdmin("POST", "", { action: "clear_error", code_id: codeId });
    if (res.success) {
      setSuccessMsg("Error Cleared! User can now withdraw permanently.");
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const onConfirm = () => {
    if (confirmDialog.type === "verify") handleVerify(confirmDialog.id);
    else if (confirmDialog.type === "activate") handleActivate(confirmDialog.id);
    else if (confirmDialog.type === "approve") handleApproveWithdrawal(confirmDialog.id);
    else if (confirmDialog.type === "clear_error") handleClearError(confirmDialog.id);
  };

  const handleCopyAcct = (purchase: Purchase) => {
    const text = `Name: ${purchase.full_name}\nEmail: ${purchase.email}\nUsername: ${purchase.username}`;
    navigator.clipboard.writeText(text);
    setCopiedId(purchase.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Chat functions
  const openChat = async (conv: Conversation) => {
    setActiveChatUserId(conv.user_id);
    setActiveChatName(conv.username);
    const data = await callAdmin("GET", "chat_messages", undefined, `&user_id=${conv.user_id}`);
    setChatMessages(Array.isArray(data) ? data : []);
  };

  const sendAdminMessage = async () => {
    if (!chatInput.trim() || !activeChatUserId) return;
    setSendingChat(true);
    await callAdmin("POST", "", { action: "send_message", user_id: activeChatUserId, message: chatInput.trim() });
    setChatInput("");
    // Refresh messages
    const data = await callAdmin("GET", "chat_messages", undefined, `&user_id=${activeChatUserId}`);
    setChatMessages(Array.isArray(data) ? data : []);
    setSendingChat(false);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Realtime for chat
  useEffect(() => {
    if (!activeChatUserId) return;
    const channel = supabase
      .channel("admin-chat-" + activeChatUserId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${activeChatUserId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setChatMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChatUserId]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateShort = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "Users" },
    { key: "alerts", label: "Alerts" },
    { key: "livechat", label: "Live Chat" },
    { key: "reports", label: "Reports" },
  ];

  // Chat detail view
  if (activeChatUserId) {
    return (
      <div className="min-h-screen max-w-md mx-auto flex flex-col bg-muted">
        <div className="bg-green-primary text-white px-4 pt-4 pb-4 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveChatUserId(null)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <p className="font-semibold text-base">{activeChatName}</p>
              <p className="text-xs text-white/70">Customer Chat</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === "support" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.sender_type === "support"
                  ? "bg-green-primary text-white rounded-br-md"
                  : "bg-card text-foreground border border-border rounded-bl-md"
              }`}>
                {msg.image_url && (
                  <img src={msg.image_url} alt="Attachment" className="rounded-lg mb-2 max-h-40 w-full object-cover" />
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.sender_type === "support" ? "text-white/60" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>
        <div className="px-4 pb-4 pt-2 bg-card border-t border-border">
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Reply as admin..."
              rows={1}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-primary/50 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); }
              }}
            />
            <button
              onClick={sendAdminMessage}
              disabled={!chatInput.trim() || sendingChat}
              className="shrink-0 w-10 h-10 bg-green-primary rounded-full flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0eb] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-[#2d4a3e] text-white px-4 py-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-xl font-bold">Admin Panel</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#e0e0d8]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold text-center relative transition-colors ${
              tab === t.key ? "text-foreground border-b-2 border-green-primary" : "text-muted-foreground"
            }`}
          >
            {t.label}
            {t.key === "alerts" && alertCount > 0 && (
              <span className="absolute -top-1 right-1/4 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* USERS TAB */}
            {tab === "users" && (
              purchases.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No users yet</div>
              ) : purchases.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#c8d6cc] flex items-center justify-center text-[#2d4a3e] font-bold text-lg flex-shrink-0">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-[15px]">{p.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.created_at)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          {p.status === "verified" ? (
                            <div>
                              <p className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </p>
                              <p className="text-xs text-green-600 flex items-center gap-1 justify-end mt-0.5">
                                ✅ Email Sent
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">user: {p.username.substring(0, 3)}</p>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setConfirmDialog({
                                  open: true, type: "verify", id: p.id,
                                  label: `Verify payment for ${p.full_name}?`,
                                })}
                                className="bg-green-primary hover:bg-green-primary/90 text-white rounded-lg px-5 py-1.5 text-xs font-semibold"
                              >
                                Verify
                              </Button>
                              <p className="text-xs text-muted-foreground mt-1">user: {p.username.substring(0, 3)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {p.status === "verified" && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleCopyAcct(p)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedId === p.id ? "Copied!" : `${p.username.substring(0, 3)} copied acct no.`}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* ALERTS TAB */}
            {tab === "alerts" && (
              alerts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No alerts</div>
              ) : alerts.map((a, idx) => (
                <div key={`${a.type}-${a.id}-${idx}`} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                      a.type === "withdrawal" ? "bg-orange-100" : "bg-blue-100"
                    }`}>
                      {a.type === "withdrawal" ? (
                        <span className="text-orange-500 text-lg">👍</span>
                      ) : (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground text-[15px]">{a.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(a.date)}</p>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {a.status === "done" || a.status === "approved" ? (
                            <span className="text-sm text-muted-foreground font-medium">Done</span>
                          ) : a.type === "activation" ? (
                            <Button
                              size="sm"
                              onClick={() => setConfirmDialog({
                                open: true, type: "activate", id: a.id,
                                label: `Activate promo code for ${a.name}?`,
                              })}
                              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs font-semibold"
                            >
                              Activate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setConfirmDialog({
                                open: true, type: "approve", id: a.id,
                                label: `Approve withdrawal for ${a.name}?`,
                              })}
                              className="bg-green-primary hover:bg-green-primary/90 text-white rounded-lg px-4 py-1.5 text-xs font-semibold"
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* LIVE CHAT TAB */}
            {tab === "livechat" && (
              conversations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No conversations</div>
              ) : conversations.map((conv) => (
                <button
                  key={conv.user_id}
                  onClick={() => openChat(conv)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#c8d6cc] flex items-center justify-center text-[#2d4a3e] font-bold text-lg flex-shrink-0">
                      {conv.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-[15px]">{conv.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{conv.email || ""}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}

            {/* REPORTS TAB */}
            {tab === "reports" && (
              reports.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No reports</div>
              ) : reports.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-[15px]">{r.username}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            👤 {r.email}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDateShort(r.created_at)}
                        </span>
                      </div>
                      {r.image_url && (
                        <img src={r.image_url} alt="Report" className="mt-2 rounded-lg max-h-32 object-cover" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog({ ...confirmDialog, open: o })}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden bg-white">
          <h2 className="text-lg font-semibold text-foreground mb-4">{confirmDialog.label}</h2>
          <div className="flex gap-3">
            <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} variant="outline" className="flex-1 py-5">
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1 py-5 bg-green-primary hover:bg-green-primary/90 text-white">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successMsg} onOpenChange={() => setSuccessMsg("")}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden bg-white">
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-16 h-16 text-green-primary" />
            <h2 className="text-lg font-bold text-foreground whitespace-pre-line">{successMsg}</h2>
            <Button onClick={() => setSuccessMsg("")} className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-white mt-2">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
