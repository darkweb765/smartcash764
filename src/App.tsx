import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/promo" element={<Promo />} />
            <Route path="/buy-promo" element={<BuyPromo />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
