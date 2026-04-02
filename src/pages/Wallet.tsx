import { useNavigate } from "react-router-dom";
import { Copy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard` });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-bold text-center mb-6">Wallet</h1>

        <p className="text-muted-foreground text-sm mb-4">
          Copy the account number below and make a deposit into your wallet.
        </p>

        {/* Account Card 1 */}
        <div className="bg-green-primary rounded-2xl p-5 mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-white/80 text-sm">Account Number</span>
            <span className="text-white/80 text-sm">Bank Name</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-white text-xl font-bold">5227367627</span>
              <button onClick={() => handleCopy("5227367627")}>
                <Copy className="w-4 h-4 text-white/70" />
              </button>
            </div>
            <span className="text-white font-bold">MONIEPOINT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80 text-sm">Charges</span>
            <span className="text-white font-bold text-sm">1% (Max ₦50)</span>
          </div>
        </div>

        {/* Account Card 2 */}
        <div className="bg-green-primary rounded-2xl p-5 mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-white/80 text-sm">Account Number</span>
            <span className="text-white/80 text-sm">Bank Name</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-white text-xl font-bold">0915530627</span>
              <button onClick={() => handleCopy("0915530627")}>
                <Copy className="w-4 h-4 text-white/70" />
              </button>
            </div>
            <span className="text-white font-bold">OPAY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80 text-sm">Charges</span>
            <span className="text-white font-bold text-sm">1% (Max ₦50)</span>
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

      <BottomNav />
    </div>
  );
};

export default Wallet;
