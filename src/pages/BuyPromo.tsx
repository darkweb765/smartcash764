import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PageState = "form" | "loading" | "notice" | "account" | "verifying" | "failed";

const BuyPromo = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (pageState === "loading") {
      const timer = setTimeout(() => setPageState("notice"), 3000);
      return () => clearTimeout(timer);
    }
    if (pageState === "verifying") {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPageState("failed");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pageState]);

  const handlePay = () => {
    if (!fullName || !email) {
      alert("Please fill in all fields");
      return;
    }
    setPageState("loading");
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Loading screen
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full border-4 border-muted border-t-green-primary animate-spin mb-8" />
        <h2 className="text-xl font-bold text-foreground">Processing your request...</h2>
        <p className="text-green-primary mt-2 text-center px-8">
          Please wait while we prepare your payment options
        </p>
      </div>
    );
  }

  // Verifying payment screen
  if (pageState === "verifying") {
    const progress = ((3 - countdown) / 3) * 100;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-8">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
            <circle cx="60" cy="60" r="52" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
              strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{countdown}</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">Verifying your payment</h2>
        <p className="text-primary mt-2 text-center px-8">
          Please wait while we confirm your bank transfer...
        </p>
      </div>
    );
  }

  // Transaction verification failed screen
  if (pageState === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center mb-6">
          <X className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-yellow-500 mb-4">Transaction verification failed!</h2>
        <p className="text-foreground text-center mb-1">Your payment could not be completed.</p>
        <p className="text-foreground text-center mb-6">
          Reason: No Payment received from you<br />or Invalid payment method.
        </p>
        <p className="text-muted-foreground text-center mb-1">If you need help contact us</p>
        <div className="flex items-center gap-2 mb-8">
          <span className="font-bold text-foreground">dailypay619@gmail.com</span>
          <button onClick={() => handleCopy("dailypay619@gmail.com", "email")}>
            {copiedField === "email" ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
        <Button
          onClick={() => setPageState("account")}
          className="w-full py-6 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold text-base rounded-xl mb-3"
        >
          Try Again
        </Button>
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          className="w-full py-6 font-bold text-base rounded-xl"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // Account details screen
  if (pageState === "account") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Bank Transfer</h1>
          <button onClick={() => navigate(-1)} className="text-red-500 font-semibold">Cancel</button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="w-14 h-14 rounded-full bg-green-primary flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-3 border-yellow-400" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">NGN 7,500</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <p className="text-green-primary text-center text-sm mb-4">Complete this bank transfer to proceed</p>

          <div className="bg-muted rounded-2xl p-5 space-y-5">
            {/* Amount */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded">₦</span>
                <span className="text-sm text-muted-foreground">Amount</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">NGN 7,500</span>
                <button onClick={() => handleCopy("7500", "amount")} className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground">
                  {copiedField === "amount" ? <Check className="w-4 h-4 text-green-primary" /> : "Copy"}
                </button>
              </div>
            </div>

            {/* Account Number */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded">123</span>
                <span className="text-sm text-muted-foreground">Account Number</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">5227367627</span>
                <button onClick={() => handleCopy("5227367627", "account")} className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground">
                  {copiedField === "account" ? <Check className="w-4 h-4 text-green-primary" /> : "Copy"}
                </button>
              </div>
            </div>

            {/* Bank Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded">🏦</span>
                <span className="text-sm text-muted-foreground">Bank Name</span>
              </div>
              <span className="text-lg font-bold text-foreground">Moniepoint MFB</span>
            </div>

            {/* Account Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded">👤</span>
                <span className="text-sm text-muted-foreground">Account Name</span>
              </div>
              <span className="text-lg font-bold text-foreground">Holuebube Jude Olimba</span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Transfer the exact amount to the account above. Your Coupon Code will be generated automatically after payment confirmation. Use your registered name as the transfer description for faster processing.
            </p>

            <Button
              onClick={() => setPageState("verifying")}
              className="w-full py-6 bg-yellow-500 hover:bg-yellow-500/90 text-foreground font-bold text-base rounded-xl"
            >
              I have made this bank Transfer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-green-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-xl font-semibold">Buy Coupon Code</span>
      </div>

      <div className="p-5 flex-1">
        <label className="text-base font-semibold text-foreground">Amount</label>
        <div className="w-full px-4 py-3.5 mb-5 mt-2 rounded-lg bg-muted text-foreground text-[15px]">
          ₦7,500
        </div>

        <label className="text-base font-semibold text-foreground">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-4 py-3.5 mb-5 mt-2 rounded-lg bg-muted text-foreground text-[15px] outline-none placeholder:text-muted-foreground border-0"
        />

        <label className="text-base font-semibold text-foreground">Your Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email address"
          className="w-full px-4 py-3.5 mb-5 mt-2 rounded-lg bg-muted text-foreground text-[15px] outline-none placeholder:text-muted-foreground border-0"
        />

        <Button
          onClick={handlePay}
          className="w-full py-6 bg-green-primary hover:bg-green-primary/90 text-primary-foreground text-lg font-semibold rounded-xl"
        >
          Pay
        </Button>
      </div>

      <p className="text-green-primary text-sm text-center px-6 pb-6">
        Your coupon code will be sent to your email once your payment has confirmed.
      </p>

      {/* Important Notice Dialog */}
      <Dialog open={pageState === "notice"} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center [&>button.absolute]:hidden bg-background">
          <h2 className="text-xl font-bold text-red-500 mb-3">Important Notice</h2>
          <p className="font-bold text-foreground mb-3">
            Please do NOT make your payment with Opay.
          </p>
          <p className="text-green-primary text-sm mb-3">
            Opay service is currently down. If you make your payment using Opay, your payment may not be confirmed.
          </p>
          <p className="text-muted-foreground text-sm mb-5">
            If you must use Opay, transfer the money to another bank and use that bank account to make your payment or use POS.
          </p>
          <Button
            onClick={() => setPageState("account")}
            className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-semibold rounded-xl"
          >
            I Understand
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyPromo;
