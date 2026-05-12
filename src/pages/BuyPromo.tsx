import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, X, Upload, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { useAppContext } from "@/contexts/AppContext";

type PageState = "form" | "loading" | "notice" | "account" | "verifying" | "failed" | "confirmed";

const CONFIRMED_KEY = "smartpay_payment_confirmed";
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

interface ConfirmedRecord { code: string; at: number; }
const readConfirmed = (): ConfirmedRecord | null => {
  try {
    const raw = localStorage.getItem(CONFIRMED_KEY);
    if (!raw) return null;
    const r: ConfirmedRecord = JSON.parse(raw);
    if (Date.now() - r.at > FOUR_HOURS_MS) {
      localStorage.removeItem(CONFIRMED_KEY);
      return null;
    }
    return r;
  } catch { return null; }
};

const BuyPromo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addNotification } = useAppContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  // (Admin entry handled by separate /admin-login route)

  // Payment details from backend
  const [paymentDetails, setPaymentDetails] = useState<{
    account_number: string;
    bank_name: string;
    account_name: string;
    amount: string;
  } | null>(null);

  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => { setReceiptFile(null); setReceiptPreview(null); };

  const uploadReceiptForUser = async (userId: string): Promise<string | null> => {
    if (!receiptFile) return null;
    try {
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, receiptFile);
      if (error) { console.error(error); return null; }
      return supabase.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl;
    } catch (e) { console.error(e); return null; }
  };

  // On mount, if a recent (<4h) confirmation exists, show confirmed screen
  useEffect(() => {
    const r = readConfirmed();
    if (r) {
      setConfirmedCode(r.code);
      setPageState("confirmed");
    }
  }, []);

  // Fetch payment details when entering account screen
  const fetchDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-actions?action=get_payment_details`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        }
      );
      const data = await res.json();
      setPaymentDetails(data);
    } catch (e) {
      console.error("Error fetching payment details:", e);
    }
  };

  useEffect(() => {
    if (pageState === "account" && !paymentDetails) {
      fetchDetails();
    }
  }, [pageState, paymentDetails]);

  // Realtime: refresh details if admin updates them
  useEffect(() => {
    const ch = supabase
      .channel("buy-promo-payment-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_settings" }, () => {
        fetchDetails();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (pageState === "loading") {
      const timer = setTimeout(() => setPageState("notice"), 3000);
      return () => clearTimeout(timer);
    }
    if (pageState === "verifying") {
      setCountdown(10);
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

  // Realtime: instantly switch to confirmed when admin verifies (any page state)
  useEffect(() => {
    let channel: any;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel("buy-promo-confirm-" + user.id)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "promo_codes",
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          const code = payload.new?.code;
          if (!code) return;
          localStorage.setItem(CONFIRMED_KEY, JSON.stringify({ code, at: Date.now() }));
          setConfirmedCode(code);
          setPageState("confirmed");
          addNotification("promo_purchased", `Your activation code is ready. Tap copy to use it. ${code}`);
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [addNotification]);

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
    if (field === "account") {
      toast({ title: "Account number copied" });
    }
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleTransferMade = async () => {
    if (!receiptFile) {
      toast({ title: "Receipt required", description: "Please upload your payment screenshot before continuing.", variant: "destructive" });
      return;
    }
    setUploadingReceipt(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const receiptUrl = await uploadReceiptForUser(user.id);
        const { data: profile } = await supabase
          .from("profiles").select("username").eq("user_id", user.id).single();

        await supabase.from("promo_purchases").insert({
          user_id: user.id,
          full_name: fullName,
          email: email,
          username: profile?.username || "Unknown",
          status: "pending",
          receipt_image: receiptUrl,
        } as any);
      }
    } catch (e) {
      console.error("Error saving purchase:", e);
    } finally {
      setUploadingReceipt(false);
    }
    setPageState("verifying");
  };

  // Admin entry: hidden corner button → routes to backend-protected admin login
  const openAdminLogin = () => navigate("/admin-login");

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
    const progress = ((10 - countdown) / 10) * 100;
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

  // Payment confirmed screen (persists for 4 hours)
  if (pageState === "confirmed" && confirmedCode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-full bg-green-primary flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3 text-center">Payment Confirmed Successfully</h2>
        <p className="text-muted-foreground text-center mb-6">
          Purchased successfully 🎉 Your activation code is below.
        </p>
        <div className="w-full max-w-sm border-2 border-green-primary/40 bg-green-primary/5 rounded-2xl p-5 mb-4">
          <p className="text-center text-sm text-muted-foreground mb-2">This is your Activation Code</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-3xl font-bold text-green-primary tracking-wider">{confirmedCode}</span>
            <button
              onClick={() => handleCopy(confirmedCode, "confirmed")}
              className="px-4 py-2 bg-green-primary text-white rounded-lg font-semibold flex items-center gap-1.5"
            >
              {copiedField === "confirmed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-6 text-center">
          A copy has also been saved to your Notifications.
        </p>
        <Button
          onClick={() => navigate("/dashboard")}
          className="w-full max-w-sm py-6 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold text-base rounded-xl"
        >
          Go to Dashboard
        </Button>
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
              <p className="text-2xl font-bold text-foreground">NGN 7,200</p>
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
                <span className="text-lg font-bold text-foreground">NGN 7,200</span>
                <button onClick={() => handleCopy("7200", "amount")} className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground">
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
                <span className="text-lg font-bold text-foreground">{paymentDetails?.account_number || "Loading..."}</span>
                <button onClick={() => handleCopy(paymentDetails?.account_number || "", "account")} className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground">
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
              <span className="text-lg font-bold text-foreground">{paymentDetails?.bank_name || "Loading..."}</span>
            </div>

            {/* Account Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded">👤</span>
                <span className="text-sm text-muted-foreground">Account Name</span>
              </div>
              <span className="text-lg font-bold text-foreground">{paymentDetails?.account_name || "Loading..."}</span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Transfer the exact amount to the account above. Your Promo Code will be generated automatically after payment confirmation. Use your registered name as the transfer description for faster processing.
            </p>

            {/* Receipt upload */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                Upload payment screenshot <span className="text-red-500">*</span>
              </p>
              {receiptPreview ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-border">
                  <img src={receiptPreview} alt="Receipt" className="w-full max-h-56 object-cover" />
                  <button
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-border rounded-xl bg-card cursor-pointer">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tap to upload payment proof</span>
                  <input type="file" accept="image/*" onChange={handleReceiptSelect} className="hidden" />
                </label>
              )}
            </div>

            <Button
              onClick={handleTransferMade}
              disabled={uploadingReceipt || !receiptFile}
              className="w-full py-6 bg-yellow-500 hover:bg-yellow-500/90 text-foreground font-bold text-base rounded-xl disabled:opacity-50"
            >
              {uploadingReceipt ? "Uploading..." : "I have made this bank Transfer"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Hidden admin entry — routes to backend-protected admin login */}
      <button
        onClick={openAdminLogin}
        className="absolute top-0 right-0 w-10 h-10 z-50 bg-transparent"
        aria-label="admin"
      />

      <div className="bg-green-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-xl font-semibold">Buy Promo Code</span>
      </div>

      <div className="p-5 flex-1">
        <label className="text-base font-semibold text-foreground">Amount</label>
        <div className="w-full px-4 py-3.5 mb-5 mt-2 rounded-lg bg-muted text-foreground text-[15px]">
          ₦7,200
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
        Your Promo Code will be sent to your notification once your payment has been confirmed.
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

      {/* Purchased Successfully Popup */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-8 text-center [&>button.absolute]:hidden bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-primary flex items-center justify-center">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-green-primary">
              Purchased Successfully! 🎉
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Congratulations! You have successfully purchased your promo code.
              Please check your app notifications to copy your Promo Code.
            </p>
            <Button
              onClick={() => { setShowSuccessPopup(false); navigate("/notifications"); }}
              className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold text-lg rounded-full"
            >
              Thanks
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* (Admin login moved to dedicated /admin-login route) */}
    </div>
  );
};

export default BuyPromo;
