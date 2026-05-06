import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { adminFetch, getAdminToken } from "@/lib/adminAuth";
import { Loader2 } from "lucide-react";

const AdminAuthGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    (async () => {
      if (!getAdminToken()) { setState("denied"); return; }
      const r = await adminFetch("admin_me");
      setState(r.ok ? "ok" : "denied");
    })();
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "denied") return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
};

export default AdminAuthGate;
