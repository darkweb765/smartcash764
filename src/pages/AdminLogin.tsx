import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPublicFetch, setAdminToken, getAdminToken } from "@/lib/adminAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getAdminToken()) { navigate("/admin-panel", { replace: true }); return; }
    (async () => {
      const r = await adminPublicFetch("admin_status", undefined, "GET");
      setMode(r.data?.has_admin ? "login" : "register");
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Email and password are required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try {
      if (mode === "register") {
        const r = await adminPublicFetch("admin_register", { email, password });
        if (!r.ok) { setError(r.data?.error || "Registration failed"); return; }
        // Then log in
      }
      const login = await adminPublicFetch("admin_login", { email, password });
      if (!login.ok) {
        setError(login.data?.error || "Invalid credentials");
        return;
      }
      setAdminToken(login.data.token, login.data.expires_at);
      navigate("/admin-panel", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-[#2d4a3e] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")}><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-xl font-bold">Admin Access</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-full bg-[#2d4a3e] flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold mb-2">
          {mode === "register" ? "Create First Admin" : "Admin Login"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          {mode === "register"
            ? "No admin account exists yet. Create the first one — registration will be locked after this."
            : "Sign in with your admin email and password."}
        </p>
        <form onSubmit={submit} className="w-full max-w-sm space-y-3">
          <Input
            type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required
          />
          <Input
            type="password" placeholder="Password (min 8 chars)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"} required
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button
            type="submit" disabled={submitting}
            className="w-full py-5 bg-[#2d4a3e] hover:bg-[#2d4a3e]/90 text-white font-semibold rounded-xl"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
              (mode === "register" ? "Create Admin & Sign In" : "Sign In")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
