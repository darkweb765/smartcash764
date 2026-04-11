import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
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

const providers = ["GOtv", "DStv", "StarTimes"];
const cablePlans: Record<string, string[]> = {
  GOtv: ["GOtv Smallie - ₦1,575", "GOtv Jinja - ₦2,700", "GOtv Jolli - ₦4,150", "GOtv Max - ₦5,700", "GOtv Supa - ₦9,600"],
  DStv: ["DStv Padi - ₦2,950", "DStv Yanga - ₦4,650", "DStv Confam - ₦7,900", "DStv Compact - ₦12,500", "DStv Compact Plus - ₦19,800", "DStv Premium - ₦37,000"],
  StarTimes: ["Nova - ₦1,200", "Basic - ₦2,600", "Smart - ₦3,800", "Classic - ₦5,500", "Super - ₦8,200"],
};

const CableTv = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleNext = () => {
    if (!provider || !plan || !cardNumber) return;
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
        <h1 className="text-lg font-bold">Cable TV</h1>
        <Clock className="w-5 h-5 ml-auto text-muted-foreground" />
      </div>

      <div className="p-5 space-y-5">
        {/* Provider Selection */}
        <div className="flex gap-3 justify-center">
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => { setProvider(p); setPlan(""); }}
              className={`px-6 py-4 rounded-xl border-2 font-bold text-sm transition-colors ${provider === p ? "border-green-primary bg-green-50 text-green-primary" : "border-border"}`}
            >
              {p}
            </button>
          ))}
        </div>

        {provider && (
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Cable Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Cable Plan" /></SelectTrigger>
              <SelectContent>
                {cablePlans[provider]?.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Smart Card / Decoder Number</label>
          <Input placeholder="Smart Card Number / Decoder Number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="h-14 rounded-xl border-2" />
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
          <h2 className="text-xl font-bold mb-2">Cable TV Subscription Successful! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">{plan} on {provider} for card {cardNumber}.</p>
          <Button onClick={() => { setShowSuccess(false); navigate("/dashboard"); }} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CableTv;
