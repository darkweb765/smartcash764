import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureUserRecords } from "@/lib/ensureUserRecords";
import { normalizeCredential } from "@/lib/identity";
import LoginHelpDialog, { LoginHelp } from "@/components/LoginHelpDialog";

const ERROR_TEXT = "Invalid email/phone number or password.";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [help, setHelp] = useState<LoginHelp | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard", { replace: true });
    };
    checkSession();
  }, [navigate]);

  const analyseFailure = async (typed: string, normalized: string, kind: string, changed: boolean) => {
    setHelp(null);
    setHelpLoading(true);
    setHelpOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-help", {
        body: { typed, normalized, kind, changed, errorMessage: ERROR_TEXT },
      });
      if (error || !data || (data as { error?: string }).error) {
        setHelp(null);
      } else {
        setHelp(data as LoginHelp);
      }
    } catch {
      setHelp(null);
    } finally {
      setHelpLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { value: cleanEmail, kind, changed } = normalizeCredential(email);

    if (!cleanEmail || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword(
      kind === "phone" ? { phone: cleanEmail, password } : { email: cleanEmail, password },
    );

    if (error || !data.session) {
      setLoading(false);
      toast({
        title: "Login Failed",
        description: ERROR_TEXT,
        variant: "destructive",
      });
      setSuggestion(changed && cleanEmail !== email ? cleanEmail : null);
      analyseFailure(email, cleanEmail, kind, changed);
      return;
    }

    // Same account on every device: make sure the records tied to this
    // auth ID exist, without ever creating a second account.
    try {
      await ensureUserRecords();
    } catch (e) {
      console.error("ensureUserRecords failed", e);
    }

    setLoading(false);
    toast({
      title: "Success",
      description: "Login successful!",
    });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col py-8 px-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/welcome")}
        className="flex items-center gap-2 text-muted-foreground mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Gift Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Gift className="w-10 h-10 text-primary-foreground" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground text-center mb-8">
        Login to SmartPay
      </h1>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="py-6 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="py-6 rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl mt-8"
        >
          {loading ? "Logging in..." : "Login"}
        </Button>

        <p className="text-center text-muted-foreground">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-primary cursor-pointer hover:underline font-medium"
          >
            Create Account
          </span>
        </p>
      </form>
    </div>
  );
};

export default Login;
