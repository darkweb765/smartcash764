import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { verifyServiceCode } from "@/utils/verifyCode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const providers = ["Spectranet", "Smile", "Swift", "IPNX", "Tizeti", "Fiberone", "Legend"];
const plans: Record<string, string[]> = {
  Spectranet: ["7GB - ₦3,500", "10GB - ₦5,000", "15GB - ₦7,000", "25GB - ₦10,000", "Unlimited - ₦15,000"],
  Smile: ["3GB - ₦2,500", "6.5GB - ₦4,000", "10GB - ₦5,000", "15GB - ₦7,500", "Unlimited - ₦18,000"],
  Swift: ["5GB - ₦3,000", "10GB - ₦5,500", "20GB - ₦9,000"],
  IPNX: ["10Mbps - ₦10,000", "25Mbps - ₦20,000", "50Mbps - ₦35,000"],
  Tizeti: ["Unlimited - ₦8,450", "Unlimited Plus - ₦14,000"],
  Fiberone: ["10Mbps - ₦12,000", "25Mbps - ₦22,000"],
  Legend: ["5GB - ₦3,000", "10GB - ₦5,500"],
};

const Internet = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState("");
  const [accountId, setAccountId] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleNext = () => {
    if (!provider || !plan || !accountId) return;
    setShowCodeDialog(true);
  };

  const handleVerifyCode = async () => {
    setVerifying(true);
    const valid = await verifyServiceCode(code);
    if (valid) {
      setShowCodeDialog(false);
      setShowSuccess(true);
      setCode("");
      setCodeError("");
    } else {
      setCodeError("Incorrect code. Please try again.");
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate("/dashboard")}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Internet</h1>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Select Provider</label>
          <Select value={provider} onValueChange={(v) => { setProvider(v); setPlan(""); }}>
            <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Select Provider" /></SelectTrigger>
            <SelectContent>
              {providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {provider && (
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Select Plan" /></SelectTrigger>
              <SelectContent>
                {plans[provider]?.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Account ID</label>
          <Input placeholder="Enter account ID" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-14 rounded-xl border-2" />
        </div>

        <Button onClick={handleNext} className="w-full h-14 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold text-base mt-4">Next</Button>
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
          <h2 className="text-xl font-bold mb-2">Internet Subscription Successful! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">{plan} on {provider} for account {accountId}.</p>
          <Button onClick={() => { setShowSuccess(false); navigate("/dashboard"); }} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Internet;
