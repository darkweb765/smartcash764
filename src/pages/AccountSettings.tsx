import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Calendar, CheckCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

const AccountSettings = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setEmail(user.email || "");
      const created = new Date(user.created_at);
      setMemberSince(created.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
      const { data } = await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle();
      if (data) setUsername(data.username);
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  const items = [
    { icon: User, label: "Full Name", value: username || "User" },
    { icon: Mail, label: "Email Address", value: email },
    { icon: CheckCircle, label: "Account Status", value: "Active", valueClass: "text-green-primary" },
    { icon: Shield, label: "Verification", value: "Verified", valueClass: "text-green-primary" },
    { icon: Calendar, label: "Member Since", value: memberSince },
  ];

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col pb-20">
      <div className="bg-green-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate("/profile")}><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-lg font-semibold">Account Information</span>
      </div>

      <div className="mx-4 mt-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center mb-2">
          <User className="w-10 h-10 text-green-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-foreground uppercase">{username || "User"}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <div className="mx-4 mt-6 bg-card rounded-2xl border border-border overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < items.length - 1 ? "border-b border-border" : ""}`}>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-green-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className={`text-sm font-semibold truncate ${item.valueClass || "text-foreground"}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="mx-4 mt-4 text-center text-muted-foreground text-sm">Loading...</div>}

      <BottomNav />
    </div>
  );
};

export default AccountSettings;
