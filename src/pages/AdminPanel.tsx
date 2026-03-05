import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
      setSuccessMsg(`Payment Confirmed Successfully!\nPromo Code: ${res.code}`);
      setConfirmDialog({ open: false, type: "", id: "", label: "" });
      fetchData();
    }
  };

  const handleActivate = async (id: string) => {
    const res = await callAdmin("POST", "", { action: "activate_code", code_id: id });
    if (res.success) {
      setSuccessMsg("Promo Code Activated Successfully!");
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

  const tabLabels: { key: Tab; label: string }[] = [
    { key: "purchases", label: "Submitted Users" },
    { key: "activations", label: "Activate Codes" },
    { key: "withdrawals", label: "Withdrawals" },
  ];

  const getHeaderTitle = () => {
    if (tab === "purchases") return "Submitted Users";
    if (tab === "activations") return "Activate Codes";
    return "Withdrawals";
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <div className="bg-[#2d4a3e] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-xl font-bold">{getHeaderTitle()}</span>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#d4d4c8] bg-white">
        {tabLabels.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              tab === t.key
                ? "text-[#2d4a3e] border-b-2 border-[#2d4a3e]"
                : "text-[#8a8a7a]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-[#8a8a7a]">Loading...</div>
        ) : (
          <>
            {/* Purchases Tab */}
            {tab === "purchases" && (
              purchases.length === 0 ? (
                <div className="text-center py-10 text-[#8a8a7a]">No pending payments</div>
              ) : (
                purchases.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#8a9a8e] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-bold text-[#1a1a1a] text-base">{p.full_name}</p>
                            <p className="text-sm text-[#6a6a6a] truncate">{p.email}</p>
                            <p className="text-xs text-[#8a8a7a] mt-1">{formatDate(p.created_at)}</p>
                          </div>
                          <span className="text-xs text-[#8a8a7a] ml-2 flex-shrink-0">user: {p.username.substring(0, 3)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
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
                        className="bg-[#4285f4] hover:bg-[#3275e4] text-white rounded-lg px-6 py-2 font-semibold"
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Activations Tab */}
            {tab === "activations" && (
              activations.length === 0 ? (
                <div className="text-center py-10 text-[#8a8a7a]">No pending activations</div>
              ) : (
                activations.map((a) => (
                  <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#8a9a8e] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(a.promo_purchases?.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1a1a1a] text-base">{a.promo_purchases?.full_name}</p>
                        <p className="text-sm text-[#6a6a6a] truncate">{a.promo_purchases?.email}</p>
                        <p className="text-xs text-[#2d4a3e] font-mono mt-1">{a.code}</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            type: "activate",
                            id: a.id,
                            label: `Activate Promo Code ${a.code} for ${a.promo_purchases?.full_name}?`,
                          })
                        }
                        className="bg-[#4285f4] hover:bg-[#3275e4] text-white rounded-lg px-6 py-2 font-semibold"
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
                <div className="text-center py-10 text-[#8a8a7a]">No pending withdrawals</div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#8a9a8e] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(w.promo_codes?.promo_purchases?.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1a1a1a] text-base">{w.promo_codes?.promo_purchases?.full_name}</p>
                        <p className="text-sm text-[#6a6a6a] truncate">{w.promo_codes?.promo_purchases?.email}</p>
                        <p className="text-xs text-[#8a8a7a] mt-1">{formatDate(w.created_at)}</p>
                        <p className="text-xs text-[#6a6a6a] mt-1">
                          Bank: {w.bank_name} | Acc: {w.account_number} | ₦{w.amount}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
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
                        className="bg-[#2d4a3e] hover:bg-[#1d3a2e] text-white rounded-lg px-6 py-2 font-semibold"
                      >
                        Approve
                      </Button>
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
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden bg-white">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">{confirmDialog.label}</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              variant="outline"
              className="flex-1 py-5 border-[#d4d4c8] text-[#1a1a1a]"
            >
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1 py-5 bg-[#2d4a3e] hover:bg-[#1d3a2e] text-white">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successMsg} onOpenChange={() => setSuccessMsg("")}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden bg-white">
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-16 h-16 text-[#2d4a3e]" />
            <h2 className="text-lg font-bold text-[#1a1a1a] whitespace-pre-line">{successMsg}</h2>
            <Button
              onClick={() => setSuccessMsg("")}
              className="w-full py-5 bg-[#2d4a3e] hover:bg-[#1d3a2e] text-white mt-2"
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
