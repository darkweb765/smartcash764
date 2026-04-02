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

const networks = ["MTN", "Airtel", "Glo", "9mobile"];
const dataPlans: Record<string, string[]> = {
  MTN: ["500MB - ₦200", "1GB - ₦300", "2GB - ₦500", "3GB - ₦1000", "5GB - ₦1500", "10GB - ₦3000"],
  Airtel: ["500MB - ₦200", "1GB - ₦300", "2GB - ₦500", "3GB - ₦1000", "5GB - ₦1500", "10GB - ₦3000"],
  Glo: ["500MB - ₦150", "1GB - ₦250", "2GB - ₦450", "3GB - ₦900", "5GB - ₦1400", "10GB - ₦2800"],
  "9mobile": ["500MB - ₦200", "1GB - ₦300", "2GB - ₦500", "3GB - ₦1000", "5GB - ₦1500"],
};

const Data = () => {
  const navigate = useNavigate();
  const [network, setNetwork] = useState("");
  const [plan, setPlan] = useState("");
  const [phone, setPhone] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const handleNext = () => {
    if (!network || !plan || !phone) return;
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
        <h1 className="text-lg font-bold">Data</h1>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Select Network</label>
          <Select value={network} onValueChange={(v) => { setNetwork(v); setPlan(""); }}>
            <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Select Network" /></SelectTrigger>
            <SelectContent>
              {networks.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {network && (
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Data Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Select Plan" /></SelectTrigger>
              <SelectContent>
                {dataPlans[network]?.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Phone Number</label>
          <Input placeholder="Enter phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-14 rounded-xl border-2" type="tel" maxLength={11} />
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
          <h2 className="text-xl font-bold mb-2">Data Purchase Successful! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">{plan} has been sent to {phone} on {network}.</p>
          <Button onClick={() => { setShowSuccess(false); navigate("/dashboard"); }} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Data;
