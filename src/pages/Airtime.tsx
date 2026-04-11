import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const networks = ["MTN", "Airtel", "Glo", "9mobile"];
const amounts = ["₦100", "₦200", "₦500", "₦1000", "₦2000", "₦5000"];

const Airtime = () => {
  const navigate = useNavigate();
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleNext = () => {
    if (!network || !phone || !amount) return;
    setShowCodeDialog(true);
  };

  const handleVerifyCode = async () => {
    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-actions?action=verify_service_code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({ code }),
        }
      );
      const data = await res.json();
      if (data.valid) {
        setShowCodeDialog(false);
        setShowSuccess(true);
        setCode("");
        setCodeError("");
      } else {
        setCodeError("Incorrect code. Please try again.");
      }
    } catch {
      setCodeError("Verification failed. Please try again.");
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Airtime</h1>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Select Network</label>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="h-14 rounded-xl border-2">
              <SelectValue placeholder="Select Network" />
            </SelectTrigger>
            <SelectContent>
              {networks.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Phone Number</label>
          <Input
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-14 rounded-xl border-2"
            type="tel"
            maxLength={11}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Amount</label>
          <Input
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 rounded-xl border-2"
            type="number"
          />
          <div className="flex gap-2 mt-3 flex-wrap">
            {amounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a.replace("₦", ""))}
                className="px-4 py-2 rounded-full border-2 border-green-primary text-sm font-medium hover:bg-green-primary hover:text-white transition-colors"
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-14 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold text-base mt-4"
        >
          Next
        </Button>
      </div>

      {/* Code Verification Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center [&>button.absolute]:hidden">
          <h2 className="text-lg font-bold mb-2">Enter Verification Code</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter your code to complete this transaction</p>
          <Input
            placeholder="Enter code"
            value={code}
            onChange={(e) => { setCode(e.target.value); setCodeError(""); }}
            className="h-12 rounded-xl text-center text-lg"
            type="password"
          />
          {codeError && <p className="text-red-500 text-sm mt-1">{codeError}</p>}
          <Button onClick={handleVerifyCode} className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold mt-3">
            Verify
          </Button>
          <Button variant="outline" onClick={() => setShowCodeDialog(false)} className="w-full h-12 rounded-xl mt-2">
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center [&>button.absolute]:hidden">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Airtime Purchase Successful! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-4">
            ₦{amount} airtime has been sent to {phone} on {network}.
          </p>
          <Button
            onClick={() => { setShowSuccess(false); navigate("/dashboard"); }}
            className="w-full h-12 rounded-xl bg-green-primary hover:bg-green-primary/90 text-white font-bold"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Airtime;
