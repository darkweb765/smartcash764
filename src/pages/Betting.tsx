import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const bettingCompanies = ["Bet9ja", "SportyBet", "1xBet", "BetKing", "NairaBet", "22Bet", "BetWay", "MerryBet", "BangBet", "MSport"];
const quickAmounts = ["₦500", "₦1000", "₦2000", "₦5000", "₦10000"];

const Betting = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const handleVerify = () => {
    if (!company || !userId || !amount) return;
    setShowCodeDialog(true);
  };

  const handleVerifyCode = () => {
    if (code === "3517") {
      setShowCodeDialog(false);
      setShowSuccess(true);
      setCode("");
      setCodeError("");
    } else {
      setCodeError("Incorrect code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate("/dashboard")}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Fund Bet Wallet</h1>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Select Provider</label>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Select Betting Company" /></SelectTrigger>
            <SelectContent>
              {bettingCompanies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Account Details</label>
          <Input placeholder="User ID / Customer ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="h-14 rounded-xl border-2" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Funding Amount</label>
          <div className="flex items-center gap-2 h-14 rounded-xl border-2 border-input px-3">
            <span className="text-lg font-bold">₦</span>
            <input
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent outline-none text-lg"
              type="number"
            />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a.replace("₦", ""))}
                className="px-4 py-2 rounded-full border-2 border-green-primary text-sm font-medium whitespace-nowrap hover:bg-green-primary hover:text-white transition-colors"
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleVerify} className="w-full h-14 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold text-base mt-4">
          VERIFY ACCOUNT
        </Button>
      </div>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center [&>button.absolute]:hidden">
          <h2 className="text-lg font-bold mb-2">Enter Verification Code</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter your code to complete this transaction</p>
          <Input placeholder="Enter code" value={code} onChange={(e) => { setCode(e.target.value); setCodeError(""); }} className="h-12 rounded-xl text-center text-lg" type="password" />
          {codeError && <p className="text-red-500 text-sm mt-1">{codeError}</p>}
          <Button onClick={handleVerifyCode} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold mt-3">Verify</Button>
          <Button variant="outline" onClick={() => setShowCodeDialog(false)} className="w-full h-12 rounded-xl mt-2">Cancel</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center [&>button.absolute]:hidden">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Betting Funding Successful! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">₦{amount} has been sent to your {company} account ({userId}).</p>
          <Button onClick={() => { setShowSuccess(false); navigate("/dashboard"); }} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Betting;
