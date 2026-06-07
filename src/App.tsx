import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Withdraw from "./pages/Withdraw";
import Notifications from "./pages/Notifications";
import Transactions from "./pages/Transactions";
import Promo from "./pages/Promo";
import BuyPromo from "./pages/BuyPromo";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin";
import AdminAuthGate from "./components/AdminAuthGate";
import JoinGroup from "./pages/JoinGroup";
import HelpSupport from "./pages/HelpSupport";
import Airtime from "./pages/Airtime";
import Data from "./pages/Data";
import CableTv from "./pages/CableTv";
import Electricity from "./pages/Electricity";
import Internet from "./pages/Internet";
import Betting from "./pages/Betting";
import Wallet from "./pages/Wallet";
import LiveChat from "./pages/LiveChat";
import ReportIssue from "./pages/ReportIssue";
import AboutSmartPay from "./pages/AboutSmartPay";
import Security from "./pages/Security";
import AccountSettings from "./pages/AccountSettings";
import GiftCard from "./pages/GiftCard";
import NotFound from "./pages/NotFound";
import SupportReplyPopup from "./components/SupportReplyPopup";
import PurchaseSuccessPopup from "./components/PurchaseSuccessPopup";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    const APP_KEYS = [
      "smartcash_balance",
      "smartcash_gift_claimed",
      "smartcash_notifications",
      "smartpay_payment_confirmed",
      "smartpay_purchase_popup_dismissed_codes",
    ];
    const LAST_USER_KEY = "smartpay_last_user_id";

    const reconcileUser = (session: Session | null) => {
      const uid = session?.user?.id ?? null;
      const prev = localStorage.getItem(LAST_USER_KEY);
      if (uid && prev && prev !== uid) {
        // Different user signed in — wipe previous user's local data
        APP_KEYS.forEach((k) => localStorage.removeItem(k));
      }
      if (uid) localStorage.setItem(LAST_USER_KEY, uid);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      reconcileUser(session);
      setSession(session);
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        reconcileUser(session);
      }
      if (event === "SIGNED_OUT") {
        // Clear per-user app data so the next account starts fresh
        APP_KEYS.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(LAST_USER_KEY);
      }
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppProvider key={session?.user?.id ?? "guest"}>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Welcome />} />
        <Route path="/welcome" element={session ? <Navigate to="/dashboard" replace /> : <Welcome />} />
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/dashboard" element={session ? <Index /> : <Navigate to="/welcome" replace />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/welcome" replace />} />
        <Route path="/withdraw" element={session ? <Withdraw /> : <Navigate to="/welcome" replace />} />
        <Route path="/notifications" element={session ? <Notifications /> : <Navigate to="/welcome" replace />} />
        <Route path="/transactions" element={session ? <Transactions /> : <Navigate to="/welcome" replace />} />
        <Route path="/promo" element={session ? <Promo /> : <Navigate to="/welcome" replace />} />
        <Route path="/buy-promo" element={session ? <BuyPromo /> : <Navigate to="/welcome" replace />} />
        <Route path="/help-support" element={session ? <HelpSupport /> : <Navigate to="/welcome" replace />} />
        <Route path="/airtime" element={session ? <Airtime /> : <Navigate to="/welcome" replace />} />
        <Route path="/data" element={session ? <Data /> : <Navigate to="/welcome" replace />} />
        <Route path="/cable-tv" element={session ? <CableTv /> : <Navigate to="/welcome" replace />} />
        <Route path="/electricity" element={session ? <Electricity /> : <Navigate to="/welcome" replace />} />
        <Route path="/internet" element={session ? <Internet /> : <Navigate to="/welcome" replace />} />
        <Route path="/join-group" element={session ? <JoinGroup /> : <Navigate to="/welcome" replace />} />
        <Route path="/betting" element={session ? <Betting /> : <Navigate to="/welcome" replace />} />
        <Route path="/wallet" element={session ? <Wallet /> : <Navigate to="/welcome" replace />} />
        <Route path="/live-chat" element={session ? <LiveChat /> : <Navigate to="/welcome" replace />} />
        <Route path="/report-issue" element={session ? <ReportIssue /> : <Navigate to="/welcome" replace />} />
        <Route path="/about-smartpay" element={session ? <AboutSmartPay /> : <Navigate to="/welcome" replace />} />
        <Route path="/security" element={session ? <Security /> : <Navigate to="/welcome" replace />} />
        <Route path="/account-settings" element={session ? <AccountSettings /> : <Navigate to="/welcome" replace />} />
        <Route path="/giftcard" element={session ? <GiftCard /> : <Navigate to="/welcome" replace />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-panel" element={<AdminAuthGate><AdminPanel /></AdminAuthGate>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
        <SupportReplyPopup />
        <PurchaseSuccessPopup />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

