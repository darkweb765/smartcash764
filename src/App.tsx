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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      <Route path="/admin-panel" element={<AdminPanel />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

