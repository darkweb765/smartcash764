import { useNavigate } from "react-router-dom";
import { Copy, Zap, Lock, AlertTriangle, Gift } from "lucide-react";
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
import { useState } from "react";

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance } = useAppContext();
  const [showDepositDialog, setShowDepositDialog] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard` });
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold text-center mb-6">Wallet</h1>

        {/* Bonus Balance Alert */}
        {balance > 0 && (
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 text-sm font-semibold">Deposit Locked</p>
            <p className="text-yellow-700 text-xs mt-1">
              To deposit money into your wallet, you must first withdraw all your bonus and purchase a Promo Code. This is required to verify your account.
            </p>
          </div>
        </div>

        {/* Account Card 1 */}
        <div className="relative">
          <div className="bg-green-primary rounded-2xl p-5 mb-4 opacity-50">
            <div className="flex justify-between mb-1">
              <span className="text-white/80 text-sm">Account Number</span>
              <span className="text-white/80 text-sm">Bank Name</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white text-xl font-bold">••••••••••</span>
              </div>
              <span className="text-white font-bold">MONIEPOINT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/80 text-sm">Charges</span>
              <span className="text-white font-bold text-sm">1% (Max ₦50)</span>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center mb-4">
            <button
              onClick={handleDepositAttempt}
              className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
            >
              <Lock className="w-4 h-4 text-green-primary" />
              <span className="text-green-primary font-semibold text-sm">Tap to Unlock</span>
            </button>
          </div>
        </div>

        {/* Account Card 2 */}
        <div className="relative">
          <div className="bg-green-primary rounded-2xl p-5 mb-6 opacity-50">
            <div className="flex justify-between mb-1">
              <span className="text-white/80 text-sm">Account Number</span>
              <span className="text-white/80 text-sm">Bank Name</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white text-xl font-bold">••••••••••</span>
              </div>
              <span className="text-white font-bold">OPAY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/80 text-sm">Charges</span>
              <span className="text-white font-bold text-sm">1% (Max ₦50)</span>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center mb-6">
            <button
              onClick={handleDepositAttempt}
              className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
            >
              <Lock className="w-4 h-4 text-green-primary" />
              <span className="text-green-primary font-semibold text-sm">Tap to Unlock</span>
            </button>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mb-4">or use the dynamic funding.</p>

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

      <BottomNav />
    </div>
  );
};

export default Wallet;
