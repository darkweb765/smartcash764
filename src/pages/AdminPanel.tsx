import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Shield, Zap, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Tab = "purchases" | "activations" | "withdrawals";

interface Purchase {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  status: string;
  created_at: string;
}

interface Activation {
  id: string;
  user_id: string;
  code: string;
  is_activated: boolean;
  created_at: string;
  promo_purchases: { full_name: string; email: string; username: string } | null;
}

interface Withdrawal {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  amount: number;
  status: string;
  created_at: string;
  promo_codes: {
    code: string;
    promo_purchases: { full_name: string; email: string; username: string } | null;
  } | null;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("purchases");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: string;
    id: string;
    label: string;
  }>({ open: false, type: "", id: "", label: "" });
  const [successMsg, setSuccessMsg] = useState("");

  const adminCode = localStorage.getItem("admin_access_code");

  const callAdmin = async (method: string, action: string, body?: any) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/admin-actions${action ? `?action=${action}` : ""}`;
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
      if (tab === "purchases") {
        const data = await callAdmin("GET", "pending_purchases");
        setPurchases(Array.isArray(data) ? data : []);
      } else if (tab === "activations") {
        const data = await callAdmin("GET", "pending_activations");
        setActivations(Array.isArray(data) ? data : []);
      } else {
        const data = await callAdmin("GET", "pending_withdrawals");
        setWithdrawals(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  const handleVerify = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "verify_payment", purchase_id: id });
    if (res.success) {
      setSuccessMsg(`Payment Confirmed Successfully! Code: ${res.code}`);
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleActivate = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "activate_code", code_id: id });
    if (res.success) {
      setSuccessMsg("Code Activated Successfully!");
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "approve_withdrawal", withdrawal_id: id });
    if (res.success) {
      setSuccessMsg("Withdrawal Approved Successfully!");
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const onConfirm = () => {
    if (confirmDialog.type === "verify") handleVerify(confirmDialog.id);
    else if (confirmDialog.type === "activate") handleActivate(confirmDialog.id);
    else if (confirmDialog.type === "approve") handleApproveWithdrawal(confirmDialog.id);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "purchases", label: "Payments", icon: CreditCard },
    { key: "activations", label: "Activate", icon: Zap },
    { key: "withdrawals", label: "Withdrawals", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <div className="bg-[#2d4a3e] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-xl font-bold">Submitted Users</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-background">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              tab === t.key
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Purchases Tab */}
            {tab === "purchases" && (
              purchases.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No pending payments</div>
              ) : (
                purchases.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#8a9a8e] flex items-center justify-center text-white font-bold text-lg">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{p.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            type: "verify",
                            id: p.id,
                            label: `Are you sure you want to confirm payment for ${p.full_name}?`,
                          })
                        }
                        className="bg-[#4285f4] hover:bg-[#3275e4] text-white rounded-lg px-5"
                      >
                        Verify
                      </Button>
                      <span className="text-xs text-muted-foreground">user: {p.username.substring(0, 3)}</span>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Activations Tab */}
            {tab === "activations" && (
              activations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No pending activations</div>
              ) : (
                activations.map((a) => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#8a9a8e] flex items-center justify-center text-white font-bold text-lg">
                      {(a.promo_purchases?.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{a.promo_purchases?.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{a.promo_purchases?.email}</p>
                      <p className="text-xs text-primary font-mono">{a.code}</p>
                    </div>
                    <div className="text-right">
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            type: "activate",
                            id: a.id,
                            label: `Activate code ${a.code} for ${a.promo_purchases?.full_name}?`,
                          })
                        }
                        className="bg-[#4285f4] hover:bg-[#3275e4] text-white rounded-lg px-5"
                      >
                        Activate
                      </Button>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Withdrawals Tab */}
            {tab === "withdrawals" && (
              withdrawals.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No pending withdrawals</div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#8a9a8e] flex items-center justify-center text-white font-bold text-lg">
                        {(w.promo_codes?.promo_purchases?.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{w.promo_codes?.promo_purchases?.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{w.promo_codes?.promo_purchases?.email}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            type: "approve",
                            id: w.id,
                            label: `Approve withdrawal of ₦${w.amount} for ${w.promo_codes?.promo_purchases?.full_name}?`,
                          })
                        }
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5"
                      >
                        Approve
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Bank: {w.bank_name} | Acc: {w.account_number} | ₦{w.amount}
                    </div>
                  </div>
                ))
              )
            )}
          </>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog({ ...confirmDialog, open: o })}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <h2 className="text-lg font-semibold text-foreground mb-4">{confirmDialog.label}</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              variant="outline"
              className="flex-1 py-5"
            >
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1 py-5 bg-primary hover:bg-primary/90 text-primary-foreground">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successMsg} onOpenChange={() => setSuccessMsg("")}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h2 className="text-lg font-bold text-foreground">{successMsg}</h2>
            <Button
              onClick={() => setSuccessMsg("")}
              className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
