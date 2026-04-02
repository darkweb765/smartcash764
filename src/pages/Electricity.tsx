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

const billers = ["Ikeja Electric", "Eko Electric", "Abuja Electric", "Ibadan Electric", "Enugu Electric", "Port Harcourt Electric", "Jos Electric", "Kaduna Electric", "Kano Electric", "Benin Electric", "Yola Electric"];

const Electricity = () => {
  const navigate = useNavigate();
  const [biller, setBiller] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const handleNext = () => {
    if (!biller || !meterNumber || !amount) return;
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
        <h1 className="text-lg font-bold">Electricity</h1>
        <span className="ml-auto text-green-primary font-semibold text-sm">History</span>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <Select value={biller} onValueChange={setBiller}>
            <SelectTrigger className="h-14 rounded-xl border-2"><SelectValue placeholder="Select Biller" /></SelectTrigger>
            <SelectContent>
              {billers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setMeterType("postpaid")}
            className={`px-6 py-2 rounded-full border-2 font-bold text-sm ${meterType === "postpaid" ? "border-green-primary bg-green-primary text-white" : "border-border"}`}
          >
            POSTPAID
          </button>
          <button
            onClick={() => setMeterType("prepaid")}
            className={`px-6 py-2 rounded-full border-2 font-bold text-sm ${meterType === "prepaid" ? "border-green-primary bg-green-primary text-white" : "border-border"}`}
          >
            PREPAID
          </button>
        </div>

        <div>
          <Input placeholder="Meter number" value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} className="h-14 rounded-xl border-2" />
        </div>

        <div>
          <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 rounded-xl border-2" type="number" />
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
          <h2 className="text-xl font-bold mb-2">Electricity Payment Successful! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">₦{amount} {meterType} payment for meter {meterNumber}.</p>
          <Button onClick={() => { setShowSuccess(false); navigate("/dashboard"); }} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Electricity;
