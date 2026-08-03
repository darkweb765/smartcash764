import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Copy, Send, Search, RefreshCw, Shield, Users, Bell, MessageCircle, FileText, X, Wallet, Save, Image as ImageIcon, Settings as SettingsIcon, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Tab = "users" | "alerts" | "livechat" | "reports" | "account" | "settings";

interface Purchase {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  status: string;
  created_at: string;
  receipt_image?: string | null;
  wallet_unlocked?: boolean;

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
  last_message_time: string | null;
  has_message?: boolean;
  registered_at?: string;
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
  const { toast } = useToast();
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
  const [search, setSearch] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);

  const callAdmin = async (method: string, action: string, body?: any, extraParams?: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const token = localStorage.getItem("admin_jwt") || "";
    const exp = Number(localStorage.getItem("admin_jwt_exp") || 0);
    if (!token || (exp && exp * 1000 < Date.now())) {
      localStorage.removeItem("admin_jwt");
      localStorage.removeItem("admin_jwt_exp");
      navigate("/admin-login");
      return null;
    }
    const url = `https://${projectId}.supabase.co/functions/v1/admin-actions?action=${action}${extraParams || ""}`;
    const opts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("admin_jwt");
      localStorage.removeItem("admin_jwt_exp");
      navigate("/admin-login");
      return null;
    }
    return res.json();
  };

  const handleAdminLogout = async (allDevices = false) => {
    await callAdmin("POST", allDevices ? "admin_logout_all" : "admin_logout");
    localStorage.removeItem("admin_jwt");
    localStorage.removeItem("admin_jwt_exp");
    navigate("/admin-login");
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
  const refreshAlertCount = async () => {
    try {
      const data = await callAdmin("GET", "alerts");
      const pending = [
        ...(data.withdrawals || []).filter((w: any) => w.status === "pending"),
        ...(data.codes || []).filter((c: any) => !c.is_activated),
      ];
      setAlertCount(pending.length);
    } catch {}
  };

  useEffect(() => {
    refreshAlertCount();
  }, []);

  // Realtime: auto-refresh admin data when DB changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-panel-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_realtime_events" }, (payload: any) => {
        const tableName = payload.new?.table_name;
        if (tableName === "promo_codes" || tableName === "withdrawal_requests") refreshAlertCount();
        if ((tableName === "promo_purchases" || tableName === "profiles") && tab === "users") fetchData();
        if ((tableName === "promo_codes" || tableName === "withdrawal_requests") && tab === "alerts") fetchData();
        if (tableName === "support_tickets" && tab === "reports") fetchData();
        if ((tableName === "chat_messages" || tableName === "profiles") && tab === "livechat") fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab, activeChatUserId]);

  const handleVerify = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "verify_payment", purchase_id: id });
    if (res.success) {
      setSuccessMsg(`Payment Verified!\nPromo Code: ${res.code}`);
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleWalletUnlock = async (userId: string, unlocked: boolean) => {
    const res = await callAdmin("POST", "", { action: "set_wallet_unlock", user_id: userId, unlocked });
    if (res.success) {
      setSuccessMsg(unlocked ? "Wallet Unlocked 🔓" : "Wallet Locked 🔒");
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

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "alerts", label: "Alerts", icon: Bell },
    { key: "livechat", label: "Live Chat", icon: MessageCircle },
    { key: "reports", label: "Reports", icon: FileText },
    { key: "account", label: "Account", icon: Wallet },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  // Settings tab state
  const [appStats, setAppStats] = useState<{ total_users: number; verified_purchases: number; pending_purchases: number } | null>(null);
  const [supportNumberInput, setSupportNumberInput] = useState("");
  const [liveSupportNumber, setLiveSupportNumber] = useState("");
  const [savingSupport, setSavingSupport] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadSettings = async () => {
    setLoadingStats(true);
    const data = await callAdmin("GET", "app_stats");
    setLoadingStats(false);
    if (data && typeof data.total_users === "number") {
      setAppStats({
        total_users: data.total_users,
        verified_purchases: data.verified_purchases || 0,
        pending_purchases: data.pending_purchases || 0,
      });
      setLiveSupportNumber(data.support_whatsapp || "");
      setSupportNumberInput(data.support_whatsapp || "");
    }
  };

  useEffect(() => { if (tab === "settings") loadSettings(); }, [tab]);

  const saveSupportNumber = async () => {
    const digits = supportNumberInput.replace(/[^0-9]/g, "");
    if (digits.length < 10) {
      toast({ title: "Enter a valid WhatsApp number", description: "Use the full number with country code, e.g. 2349049242069", variant: "destructive" });
      return;
    }
    setSavingSupport(true);
    const res = await callAdmin("POST", "", { action: "update_support_number", support_whatsapp: digits });
    setSavingSupport(false);
    if (res?.success) {
      setLiveSupportNumber(res.support_whatsapp);
      setSupportNumberInput(res.support_whatsapp);
      toast({ title: "Support number updated", description: "All WhatsApp support links in the app now use this number." });
    } else {
      toast({ title: res?.error || "Failed to update number", variant: "destructive" });
    }
  };

  // Account settings state
  const [acctNumber, setAcctNumber] = useState("");
  const [acctName, setAcctName] = useState("");
  const [acctBank, setAcctBank] = useState("");
  const [liveDetails, setLiveDetails] = useState<{ account_number: string; account_name: string; bank_name: string } | null>(null);
  const [savingAcct, setSavingAcct] = useState(false);

  const loadAccount = async () => {
    const { data } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (data) {
      setLiveDetails({ account_number: data.account_number, account_name: data.account_name, bank_name: data.bank_name });
      setAcctNumber(data.account_number);
      setAcctName(data.account_name);
      setAcctBank(data.bank_name);
    }
  };

  useEffect(() => { if (tab === "account") { loadAccount(); loadMasterCodes(); } }, [tab]);

  // Admin master withdrawal codes
  const [masterCodes, setMasterCodes] = useState<{ id: string; code: string; used_at: string | null; created_at: string }[]>([]);
  const [genMaster, setGenMaster] = useState(false);

  const loadMasterCodes = async () => {
    const data = await callAdmin("GET", "list_master_codes");
    setMasterCodes(Array.isArray(data) ? data : []);
  };

  const generateMasterCode = async () => {
    setGenMaster(true);
    const res = await callAdmin("POST", "", { action: "create_master_code" });
    setGenMaster(false);
    if (res?.success) {
      toast({ title: "Code generated", description: res.code });
      loadMasterCodes();
    } else {
      toast({ title: "Failed to generate code", variant: "destructive" });
    }
  };

  const deleteMasterCode = async (id: string) => {
    const res = await callAdmin("POST", "delete_master_code", { id });
    if (res?.success) loadMasterCodes();
  };



  // Realtime: keep account form/live in sync
  useEffect(() => {
    const ch = supabase
      .channel("admin-payment-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_settings" }, () => {
        loadAccount();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const saveAccount = async () => {
    if (!acctNumber.trim() || !acctName.trim() || !acctBank.trim()) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setSavingAcct(true);
    const res = await callAdmin("POST", "", {
      action: "update_payment_details",
      account_number: acctNumber.trim(),
      account_name: acctName.trim(),
      bank_name: acctBank.trim(),
    });
    setSavingAcct(false);
    if (res?.success) {
      toast({ title: "Account updated", description: "Buy Promo Code page now shows the new details." });
      loadAccount();
    } else {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const q = search.trim().toLowerCase();
  const filteredPurchases = q
    ? purchases.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q))
    : purchases;
  const filteredAlerts = q
    ? alerts.filter(a => a.name?.toLowerCase().includes(q) || a.message?.toLowerCase().includes(q))
    : alerts;
  const filteredConversations = q
    ? conversations.filter(c =>
        c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q))
    : conversations;
  const filteredReports = q
    ? reports.filter(r =>
        r.username?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q))
    : reports;

  const stats = {
    totalUsers: purchases.length,
    verifiedUsers: purchases.filter(p => p.status === "verified").length,
    pendingAlerts: alertCount,
  };

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
      <div className="bg-[#2d4a3e] text-white px-4 pt-4 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-300" />
                <span className="text-lg font-bold leading-none">Admin Panel</span>
              </div>
              <p className="text-[11px] text-white/70 mt-1">SmartPay · Secure session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => handleAdminLogout(false)}
              className="px-3 h-9 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold"
              aria-label="Logout"
            >
              Logout
            </button>
            <button
              onClick={() => handleAdminLogout(true)}
              className="px-3 h-9 rounded-full bg-red-500/30 hover:bg-red-500/50 text-xs font-semibold"
              aria-label="Logout all devices"
              title="Logout all devices"
            >
              All
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <p className="text-[10px] text-white/70 uppercase tracking-wide">Users</p>
            <p className="text-base font-bold mt-0.5">{stats.totalUsers}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <p className="text-[10px] text-white/70 uppercase tracking-wide">Verified</p>
            <p className="text-base font-bold mt-0.5">{stats.verifiedUsers}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <p className="text-[10px] text-white/70 uppercase tracking-wide">Pending</p>
            <p className="text-base font-bold mt-0.5 text-orange-300">{stats.pendingAlerts}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 bg-[#f0f0eb]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "users" ? "Search user by name, email or username" :
              tab === "alerts" ? "Search alerts by name or message" :
              tab === "livechat" ? "Search conversations" : "Search reports"
            }
            className="pl-9 pr-9 h-10 bg-white border-[#e0e0d8] rounded-xl text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#e0e0d8] sticky top-0 z-10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-semibold text-center relative transition-colors ${
                isActive ? "text-foreground border-b-2 border-green-primary" : "text-muted-foreground border-b-2 border-transparent"
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Icon className={`w-4 h-4 ${isActive ? "text-green-primary" : ""}`} />
                <span>{t.label}</span>
              </div>
              {t.key === "alerts" && alertCount > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* USERS TAB */}
            {tab === "users" && (
              filteredPurchases.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No users yet</div>
              ) : filteredPurchases.map((p) => {
                const displayName = p.full_name || p.username || "User";
                const shortU = (p.username || "usr").substring(0, 3);
                const isRegisteredOnly = p.status === "registered";
                return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#c8d6cc] flex items-center justify-center text-[#2d4a3e] font-bold text-lg flex-shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-[15px]">{displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">{p.email || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.created_at)}</p>
                          {p.receipt_image && (
                            <button
                              onClick={() => setProofImage(p.receipt_image!)}
                              className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-blue-600 hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              View proof
                            </button>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          {isRegisteredOnly ? (
                            <p className="text-xs text-muted-foreground font-medium">Registered</p>
                          ) : p.status === "verified" ? (
                            <div>
                              <p className="text-xs text-green-600 font-semibold flex items-center gap-1 justify-end">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </p>
                              <p className="text-xs text-green-600 flex items-center gap-1 justify-end mt-0.5">
                                ✅ Email Sent
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">user: {shortU}</p>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setConfirmDialog({
                                  open: true, type: "verify", id: p.id,
                                  label: `Verify payment for ${displayName}?`,
                                })}
                                className="bg-green-primary hover:bg-green-primary/90 text-white rounded-lg px-5 py-1.5 text-xs font-semibold"
                              >
                                Verify
                              </Button>
                              <p className="text-xs text-muted-foreground mt-1">user: {shortU}</p>
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
                        {copiedId === p.id ? "Copied!" : `${shortU} copied acct no.`}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#eeeee8]">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" />
                      Wallet {p.wallet_unlocked ? "Unlocked 🔓" : "Locked 🔒"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleWalletUnlock(p.user_id, !p.wallet_unlocked)}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                        p.wallet_unlocked
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-green-primary hover:bg-green-primary/90 text-white"
                      }`}
                    >
                      {p.wallet_unlocked ? "Lock Wallet" : "Unlock Wallet 🔓"}
                    </Button>
                  </div>

                </div>
                );
              })
            )}

            {/* ALERTS TAB */}
            {tab === "alerts" && (
              filteredAlerts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No alerts</div>
              ) : filteredAlerts.map((a, idx) => (
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
                          {(() => {
                            const stage = a.withdrawal_stage;
                            // Show "Done" for completed stages
                            if (stage === "completed" || stage === "cleared") {
                              return <span className="text-sm text-green-600 font-medium">✅ Done</span>;
                            }
                            // Activation type: show Activate button if not yet activated
                            if (a.type === "activation" && a.status === "pending") {
                              return (
                                <Button size="sm"
                                  onClick={() => setConfirmDialog({
                                    open: true, type: "activate", id: a.id,
                                    label: `Activate promo code for ${a.name}?`,
                                  })}
                                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs font-semibold">
                                  Activate
                                </Button>
                              );
                            }
                            // Withdrawal type with needs_clearing stage
                            if (a.type === "withdrawal" && stage === "needs_clearing") {
                              return (
                                <Button size="sm"
                                  onClick={() => setConfirmDialog({
                                    open: true, type: "clear_error", id: a.code_id || a.id,
                                    label: `Clear error for ${a.name}? This will allow permanent withdrawal.`,
                                  })}
                                  className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-1.5 text-xs font-semibold">
                                  Clear Error
                                </Button>
                              );
                            }
                            // Withdrawal type with needs_approval stage
                            if (a.type === "withdrawal" && (stage === "needs_approval" || a.status === "pending")) {
                              return (
                                <Button size="sm"
                                  onClick={() => setConfirmDialog({
                                    open: true, type: "approve", id: a.id,
                                    label: `Approve withdrawal for ${a.name}?`,
                                  })}
                                  className="bg-green-primary hover:bg-green-primary/90 text-white rounded-lg px-4 py-1.5 text-xs font-semibold">
                                  Approve
                                </Button>
                              );
                            }
                            // Default done state
                            if (a.status === "done" || a.status === "approved") {
                              return <span className="text-sm text-muted-foreground font-medium">Done</span>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* LIVE CHAT TAB */}
            {tab === "livechat" && (
              filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No conversations</div>
              ) : filteredConversations.map((conv) => (
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
                            <span className={`w-2 h-2 rounded-full ${conv.last_message ? "bg-green-500" : "bg-muted-foreground/40"}`}></span>
                            <p className="text-sm text-muted-foreground truncate italic">
                              {conv.last_message || "Tap to start a conversation"}
                            </p>
                          </div>
                        </div>
                        {conv.last_message_time && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatTime(conv.last_message_time)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}

            {/* REPORTS TAB */}
            {tab === "reports" && (
              filteredReports.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No reports</div>
              ) : filteredReports.map((r) => (
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

            {/* ACCOUNT TAB */}
            {tab === "account" && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-5 h-5 text-green-primary" />
                    <h3 className="font-bold text-foreground text-base">Change Account Details</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These details show on the Buy Promo Code page. Updates apply instantly to all users.
                  </p>
                </div>

                {liveDetails && (
                  <div className="bg-[#e8e8e0] rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-2">Currently Live</p>
                    <p className="text-sm text-foreground"><span className="text-muted-foreground">Account No:</span> <span className="font-bold">{liveDetails.account_number}</span></p>
                    <p className="text-sm text-foreground"><span className="text-muted-foreground">Name:</span> <span className="font-bold uppercase">{liveDetails.account_name}</span></p>
                    <p className="text-sm text-foreground"><span className="text-muted-foreground">Bank:</span> <span className="font-bold uppercase">{liveDetails.bank_name}</span></p>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Account Number</label>
                    <Input value={acctNumber} onChange={(e) => setAcctNumber(e.target.value)} className="mt-2 bg-muted border-border h-11" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Account Name</label>
                    <Input value={acctName} onChange={(e) => setAcctName(e.target.value)} className="mt-2 bg-muted border-border h-11 uppercase" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Bank Name</label>
                    <Input value={acctBank} onChange={(e) => setAcctBank(e.target.value)} className="mt-2 bg-muted border-border h-11 uppercase" />
                  </div>
                  <Button
                    onClick={saveAccount}
                    disabled={savingAcct}
                    className="w-full py-6 bg-[#2d4a3e] hover:bg-[#2d4a3e]/90 text-white font-bold rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingAcct ? "Saving..." : "Update Account"}
                  </Button>
                </div>

                {/* Admin Master Withdrawal Codes */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-green-primary" />
                    <h3 className="font-bold text-foreground text-base">Admin Withdrawal Codes</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate a one-time code that completes any withdrawal instantly — no activation, no approval steps.
                  </p>
                  <Button
                    onClick={generateMasterCode}
                    disabled={genMaster}
                    className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-white font-bold rounded-xl"
                  >
                    {genMaster ? "Generating..." : "Generate New Code"}
                  </Button>
                </div>

                {masterCodes.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1">Recent Codes</p>
                    {masterCodes.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <div className="flex-1">
                          <p className="font-mono font-bold text-foreground">{m.code}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.used_at ? `Used ${formatDateShort(m.used_at)}` : "Unused"}
                          </p>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(m.code); setCopiedId(m.id); setTimeout(() => setCopiedId(null), 1500); }}
                          className="p-2 text-green-primary"
                          aria-label="Copy"
                        >
                          {copiedId === m.id ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => deleteMasterCode(m.id)}
                          className="p-2 text-destructive"
                          aria-label="Delete"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

      {/* Proof Image Dialog */}
      <Dialog open={!!proofImage} onOpenChange={() => setProofImage(null)}>
        <DialogContent className="max-w-md mx-auto rounded-2xl border-0 p-3 bg-white">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-foreground px-1">Payment Proof</p>
            {proofImage && (
              <img src={proofImage} alt="Payment proof" className="w-full rounded-xl object-contain max-h-[70vh]" />
            )}
            <Button onClick={() => setProofImage(null)} className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-white">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
