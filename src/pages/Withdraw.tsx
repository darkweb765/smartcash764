import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, Copy } from "lucide-react";
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
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus>("form");
  const [withdrawnAmount, setWithdrawnAmount] = useState("");
  const [userPromoCode, setUserPromoCode] = useState<any>(null);

  // Load user's promo code
  useEffect(() => {
    const loadPromoCode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          setUserPromoCode(data[0]);
        }
      }
    };
    loadPromoCode();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleWithdraw = async () => {
    // Validate all fields
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

    // Check promo code - must match user's unique code
    if (!promoCode || !userPromoCode || promoCode !== userPromoCode.code) {
      setShowPromoDialog(true);
      return;
    }

    // Check if code is activated
    if (!userPromoCode.is_activated) {
      setShowActivateDialog(true);
      addNotification("withdrawal_activate", "Please activate your promo code before withdrawal", amountNum);
      return;
    }

    // Code is valid and activated - create withdrawal request
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

    setWithdrawnAmount(amount);
    deductBalance(amountNum);
    addNotification("withdrawal_pending", "Withdrawal is being processed", amountNum);
    setWithdrawStatus("pending");
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(value);
  };

  // Success/Pending Screen
  if (withdrawStatus === "success" || withdrawStatus === "pending") {
    const isPending = withdrawStatus === "pending";

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
            {isPending ? "Withdrawal Pending" : "Withdraw Successfully"}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {isPending
              ? `Your withdrawal of ₦${formatCurrency(parseFloat(withdrawnAmount))} is being processed.`
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

      {/* Activate Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-medium text-foreground">
              Please activate your code before withdrawal.
            </h2>
            <div className="flex gap-3 w-full mt-4">
              <Button onClick={() => setShowActivateDialog(false)} variant="outline"
                className="flex-1 py-5 border-green-primary text-green-primary">
                Close
              </Button>
              <Button onClick={() => { setShowActivateDialog(false); navigate("/buy-promo"); }}
                className="flex-1 py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground">
                Activate
              </Button>
            </div>
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
              Incorrect promo code, please click button below to buy your promo code
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
