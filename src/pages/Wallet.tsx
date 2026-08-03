import { useNavigate } from "react-router-dom";
import { Copy, Zap, Lock, AlertTriangle, Gift, PartyPopper, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import BottomNav from "@/components/BottomNav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CONGRATS_SEEN_KEY = "smartpay_wallet_congrats_seen";


// Deterministic 10-digit account number derived from the user id so each user
// gets a stable, realistic-looking account they can copy.
const deriveAccount = (seed: string, salt: string) => {
  let h = 0;
  const input = `${seed}-${salt}`;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  // Pad to 10 digits, ensure it doesn't start with 0
  let num = (h % 9000000000) + 1000000000;
  return String(num);
};

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance } = useAppContext();
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showCongratsDialog, setShowCongratsDialog] = useState(false);
  const [bonusWithdrawn, setBonusWithdrawn] = useState<boolean>(false);
  const [accountName, setAccountName] = useState<string>("SmartPay User");
  const [userId, setUserId] = useState<string>("");

  const applyUnlock = (unlocked: boolean) => {
    setBonusWithdrawn(unlocked);
    if (unlocked) {
      try {
        if (localStorage.getItem(CONGRATS_SEEN_KEY) !== "true") {
          setShowCongratsDialog(true);
          localStorage.setItem(CONGRATS_SEEN_KEY, "true");
        }
      } catch {}
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.username) setAccountName(String(data.username).toUpperCase());

      const { data: state } = await supabase
        .from("user_app_state")
        .select("wallet_unlocked")
        .eq("user_id", user.id)
        .maybeSingle();
      applyUnlock(!!state?.wallet_unlocked);

      // Realtime: admin unlocking the wallet reflects instantly
      channel = supabase
        .channel(`wallet-unlock-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "user_app_state", filter: `user_id=eq.${user.id}` },
          (payload: any) => applyUnlock(!!payload.new?.wallet_unlocked)
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);


  const moniepointAccount = useMemo(
    () => (userId ? deriveAccount(userId, "moniepoint") : "•••••••••"),
    [userId]
  );
  const opayAccount = useMemo(
    () => (userId ? deriveAccount(userId, "opay") : "•••••••••"),
    [userId]
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const handleDepositAttempt = () => {
    setShowDepositDialog(true);
  };

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderUnlockedCard = (bank: string, account: string) => (
    <div className="bg-green-primary rounded-2xl p-5 mb-4 shadow-lg">
      <div className="flex justify-between mb-1">
        <span className="text-white/80 text-xs">Account Number</span>
        <span className="text-white/80 text-xs">Bank Name</span>
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-xl font-bold tracking-wider">{account}</span>
          <button
            onClick={() => handleCopy(account, `${bank} account number`)}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label={`Copy ${bank} account number`}
          >
            <Copy className="w-4 h-4 text-white" />
          </button>
        </div>
        <span className="text-white font-bold">{bank}</span>
      </div>
      <div className="border-t border-white/20 pt-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-white/80 text-xs">Account Name</span>
          <span className="text-white font-semibold text-xs truncate max-w-[60%] text-right">{accountName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/80 text-xs">Charges</span>
          <span className="text-white font-bold text-xs">1% (Max ₦50)</span>
        </div>
      </div>
    </div>
  );

  const renderLockedCard = (bank: string) => (
    <div className="relative mb-4">
      <div className="bg-green-primary rounded-2xl p-5 opacity-50">
        <div className="flex justify-between mb-1">
          <span className="text-white/80 text-sm">Account Number</span>
          <span className="text-white/80 text-sm">Bank Name</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-white text-xl font-bold">••••••••••</span>
          <span className="text-white font-bold">{bank}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/80 text-sm">Charges</span>
          <span className="text-white font-bold text-sm">1% (Max ₦50)</span>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={handleDepositAttempt}
          className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
        >
          <Lock className="w-4 h-4 text-green-primary" />
          <span className="text-green-primary font-semibold text-sm">Tap to Unlock</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold text-center mb-6">Wallet</h1>

        {/* Bonus Balance Alert */}
        {balance > 0 && !bonusWithdrawn && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Gift className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-orange-800 text-sm">You have a bonus of {formatBalance(balance)}</p>
              <p className="text-orange-600 text-xs mt-1">
                Please withdraw your bonus before you can deposit money into your wallet.
              </p>
              <button
                onClick={() => navigate("/withdraw")}
                className="mt-2 bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-full"
              >
                Withdraw Bonus Now
              </button>
            </div>
          </div>
        )}

        {/* Notice */}
        {bonusWithdrawn ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 text-sm font-semibold">Wallet Unlocked</p>
              <p className="text-green-700 text-xs mt-1">
                Your account is now fully active. Copy any account number below and fund your wallet via bank transfer.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 text-sm font-semibold">Deposit Locked</p>
              <p className="text-yellow-700 text-xs mt-1">
                To deposit money into your wallet, you must first withdraw all your bonus and purchase a Promo Code. This is required to verify your account.
              </p>
            </div>
          </div>
        )}

        {/* Account Cards */}
        {bonusWithdrawn ? (
          <>
            {renderUnlockedCard("MONIEPOINT", moniepointAccount)}
            {renderUnlockedCard("OPAY", opayAccount)}
          </>
        ) : (
          <>
            {renderLockedCard("MONIEPOINT")}
            {renderLockedCard("OPAY")}
          </>
        )}

        <p className="text-center text-muted-foreground text-sm mb-4 mt-2">or use the dynamic funding.</p>

        {/* Dynamic Funding */}
        <button
          onClick={() => navigate("/buy-promo")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-green-primary"
        >
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-foreground">Dynamic Funding</p>
            <p className="text-xs text-muted-foreground">Instant funding, fast and reliable</p>
          </div>
          <span className="text-muted-foreground">›</span>
        </button>
      </div>

      {/* Deposit Locked Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="rounded-2xl max-w-[90%] mx-auto">
          <DialogHeader className="text-center items-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-bold">Deposit Not Available</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              You need to withdraw your bonus balance and purchase a Promo Code before you can deposit money into your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {balance > 0 && (
              <button
                onClick={() => {
                  setShowDepositDialog(false);
                  navigate("/withdraw");
                }}
                className="w-full bg-green-primary text-white font-semibold py-3 rounded-xl"
              >
                Withdraw Bonus ({formatBalance(balance)})
              </button>
            )}
            <button
              onClick={() => {
                setShowDepositDialog(false);
                navigate("/buy-promo");
              }}
              className="w-full bg-green-primary/10 text-green-primary font-semibold py-3 rounded-xl border border-green-primary"
            >
              Buy Promo Code
            </button>
            <button
              onClick={() => setShowDepositDialog(false)}
              className="w-full text-muted-foreground font-medium py-2"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Congratulations Dialog (shown once after first bonus withdrawal) */}
      <Dialog open={showCongratsDialog} onOpenChange={setShowCongratsDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-8 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-primary flex items-center justify-center">
              <PartyPopper className="w-10 h-10 text-green-primary" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-foreground">Congratulations 🎉</h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Your wallet has been unlocked successfully. You can now fund your wallet by bank transfer and also send money to anyone.
            </p>
            <Button
              onClick={() => setShowCongratsDialog(false)}
              className="w-full mt-2 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold py-6 text-lg rounded-xl"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Wallet;
