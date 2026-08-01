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
const CONFIRMED_COOLDOWN_MS = 3 * 60 * 60 * 1000;

interface ConfirmedRecord { code: string; at: number; }
const readConfirmed = (): ConfirmedRecord | null => {
  try {
    const raw = localStorage.getItem(CONFIRMED_KEY);
    if (!raw) return null;
    const r: ConfirmedRecord = JSON.parse(raw);
    if (Date.now() - r.at > CONFIRMED_COOLDOWN_MS) {
      localStorage.removeItem(CONFIRMED_KEY);
      return null;
    }
    return r;
  } catch { return null; }
};

const VERIFY_MESSAGES = [
  "Checking payment…",
  "Confirming transaction…",
  "Verifying account…",
  "Almost done…",
];

const BuyPromo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addNotification } = useAppContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pageState, setPageState] = useState<PageState>("form");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [verifyMsgIdx, setVerifyMsgIdx] = useState(0);

  // (Admin entry handled by separate /admin-login route)

  const { paymentDetails, paymentError, fetchDetails } = usePaymentAccount(pageState === "account");


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

  const showConfirmed = (code: string, at = Date.now()) => {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify({ code, at }));
    setConfirmedCode(code);
    setPageState("confirmed");
  };

  const fetchLatestConfirmedCode = async (uid: string) => {
    const { data } = await supabase
      .from("promo_codes")
      .select("code, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return { code: data.code, at: new Date(data.created_at).getTime() };
  };

  // On mount: check localStorage first, then query DB for latest promo_code within cooldown.
  // This ensures the confirmed screen shows for any user (not just admin) even if
  // the admin verified while the user was on a different page or had the app closed.
  useEffect(() => {
    const r = readConfirmed();
    if (r) {
        showConfirmed(r.code, r.at);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Prefill full name & email from the registered user
      if (user.email) setEmail((prev) => prev || user.email!);
      const { data: profile } = await supabase
        .from("profiles").select("username").eq("user_id", user.id).maybeSingle();
      if (profile?.username) setFullName((prev) => prev || profile.username);

      const latest = await fetchLatestConfirmedCode(user.id);
      if (latest && Date.now() - latest.at <= CONFIRMED_COOLDOWN_MS) {
        showConfirmed(latest.code, latest.at);
      }
    })();
  }, []);



  useEffect(() => {
    if (pageState === "loading") {
      const timer = setTimeout(() => setPageState("notice"), 3000);
      return () => clearTimeout(timer);
    }
    if (pageState === "verifying") {
      setCountdown(10);
      setVerifyMsgIdx(0);
      const msgInterval = setInterval(() => {
        setVerifyMsgIdx((i) => (i + 1) % VERIFY_MESSAGES.length);
      }, 2200);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            clearInterval(msgInterval);
            setPageState("failed");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { clearInterval(interval); clearInterval(msgInterval); };
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
          showConfirmed(code);
          // Global PurchaseSuccessPopup handles the modal; AppContext handles the notification.
        })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "promo_purchases",
          filter: `user_id=eq.${user.id}`,
        }, async (payload: any) => {
          if (payload.new?.status !== "verified") return;
          const latest = await fetchLatestConfirmedCode(user.id);
          if (latest) showConfirmed(latest.code, payload.new?.verified_at ? new Date(payload.new.verified_at).getTime() : Date.now());
        })
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        }, async (payload: any) => {
          if (payload.new?.type !== "promo_purchased") return;
          const code = String(payload.new?.message || "").match(/PEF\d{5}/)?.[0];
          if (code) showConfirmed(code, new Date(payload.new.created_at || Date.now()).getTime());
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, []);

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
        <p className="text-primary mt-2 text-center px-8 transition-opacity duration-300" key={verifyMsgIdx}>
          {VERIFY_MESSAGES[verifyMsgIdx]}
        </p>
      </div>
    );
  }

  // Payment confirmed screen (persists for 4 hours) — ticket / receipt style
  if (pageState === "confirmed" && confirmedCode) {
    return (
      <div className="min-h-screen bg-background flex flex-col px-5 pt-10 pb-8">
        {/* Hero */}
        <div className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-green-primary to-green-primary/70 text-white p-6 shadow-xl">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 w-28 h-28 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Check className="w-7 h-7 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Payment</p>
              <h2 className="text-xl font-extrabold leading-tight">Confirmed Successfully</h2>
            </div>
          </div>
          <p className="relative text-sm mt-4 opacity-95">
            Purchased successfully 🎊 Your promo code is ready below.
          </p>
        </div>

        {/* Ticket cut */}
        <div className="w-full max-w-sm mx-auto -mt-3 flex items-center">
          <div className="w-5 h-5 rounded-full bg-background -ml-2" />
          <div className="flex-1 border-t-2 border-dashed border-border" />
          <div className="w-5 h-5 rounded-full bg-background -mr-2" />
        </div>

        {/* Code card */}
        <div className="w-full max-w-sm mx-auto bg-card border border-border rounded-3xl p-5 mt-3 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-3">
            Your Promo Code
          </p>
          <div className="flex items-center justify-between gap-3 bg-green-primary/5 border border-dashed border-green-primary/40 rounded-2xl px-4 py-3">
            <span className="text-2xl font-extrabold text-green-primary tracking-[0.25em]">{confirmedCode}</span>
            <button
              onClick={() => handleCopy(confirmedCode, "confirmed")}
              className="shrink-0 px-3 py-2 bg-green-primary text-white rounded-xl font-semibold flex items-center gap-1.5 text-sm active:scale-95 transition-transform"
            >
              {copiedField === "confirmed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedField === "confirmed" ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            A copy has been saved permanently to your Notifications.
          </p>
        </div>

        <div className="flex-1" />

        <div className="w-full max-w-sm mx-auto space-y-3">
          <Button
            onClick={() => navigate("/notifications")}
            variant="outline"
            className="w-full py-6 font-semibold rounded-xl border-green-primary/40 text-green-primary"
          >
            View in Notifications
          </Button>
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full py-6 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold text-base rounded-xl"
          >
            Go to Dashboard
          </Button>
        </div>
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

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-red-600 mb-2">
                {paymentError}
              </p>
              <button
                onClick={fetchDetails}
                className="text-sm font-bold text-red-600 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!paymentError && (
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
                <span className="text-lg font-bold text-foreground">{paymentDetails?.account_number || "Loading…"}</span>
                <button
                  disabled={!paymentDetails?.account_number}
                  onClick={() => paymentDetails?.account_number && handleCopy(paymentDetails.account_number, "account")}
                  className="px-4 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground disabled:opacity-40"
                >
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
              <span className="text-lg font-bold text-foreground">{paymentDetails?.bank_name || "Loading…"}</span>
            </div>

            {/* Account Name */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded">👤</span>
                <span className="text-sm text-muted-foreground">Account Name</span>
              </div>
              <span className="text-lg font-bold text-foreground">{paymentDetails?.account_name || "Loading…"}</span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Transfer the exact amount to the account above. Your Promo Code will be generated automatically after payment confirmation. Use your registered name as the transfer description for faster processing.
            </p>
          </div>
          )}

          <div className="bg-muted rounded-2xl p-5 mt-4 space-y-5">

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
              disabled={uploadingReceipt || !receiptFile || !paymentDetails || !!paymentError}
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
