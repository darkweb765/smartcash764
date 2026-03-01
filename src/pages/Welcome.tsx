import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const Welcome = () => {
  const navigate = useNavigate();
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col items-center justify-between py-12 px-6">
      {/* Gift Icon with Rings */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Outer rings */}
          <div className="absolute inset-0 w-48 h-48 rounded-full border-2 border-primary/10 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
          <div className="absolute inset-0 w-40 h-40 rounded-full border-2 border-primary/15 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
          <div className="absolute inset-0 w-32 h-32 rounded-full border-2 border-primary/20 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
          
          {/* Center icon */}
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Gift className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="w-full space-y-4">
        <h1 className="text-2xl font-bold text-foreground text-center mb-8">
          Welcome to SmartPay
        </h1>

        {/* Login Button */}
        <Button
          onClick={() => navigate("/login")}
          className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          Login
        </Button>

        {/* Create Account Button */}
        <Button
          onClick={() => navigate("/register")}
          className="w-full py-6 text-lg font-semibold bg-green-dark hover:bg-green-dark/90 text-primary-foreground rounded-xl"
        >
          Create Account
        </Button>

        {/* Privacy Policy Checkbox */}
        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id="policy"
            checked={acceptedPolicy}
            onCheckedChange={(checked) => setAcceptedPolicy(checked as boolean)}
            className="border-muted-foreground"
          />
          <label htmlFor="policy" className="text-sm text-muted-foreground">
            I have reviewed and accept the{" "}
            <span className="text-primary cursor-pointer hover:underline">
              Privacy Policy
            </span>
          </label>
        </div>
      </div>

      {/* Version */}
      <p className="text-muted-foreground text-sm mt-8">version: 1.0.5</p>
    </div>
  );
};

export default Welcome;
