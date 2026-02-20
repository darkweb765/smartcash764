import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Settings, ShoppingCart, Info, MessageCircle, Shield, HelpCircle, LogOut, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      setEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Logged out successfully" });
      navigate("/welcome");
    }
  };

  const menuItems = [
    { icon: Settings, label: "Account Settings", onClick: () => {} },
    { icon: ShoppingCart, label: "Buy Promo Code", onClick: () => navigate("/buy-promo") },
    { icon: Info, label: "About SmartPay", onClick: () => {} },
    { icon: MessageCircle, label: "Join WhatsApp Group", onClick: () => window.open("https://wa.me/", "_blank") },
    { icon: Shield, label: "Security", onClick: () => {} },
    { icon: HelpCircle, label: "Help & Support", onClick: () => {} },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col pb-20">
      {/* Green Header */}
      <div className="bg-green-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-lg font-semibold">Profile</span>
      </div>

      {/* Profile Card */}
      <div className="mx-4 mt-4 bg-card rounded-2xl p-6 flex flex-col items-center border border-border">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-green-primary" strokeWidth={1.5} />
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-primary rounded-full flex items-center justify-center border-2 border-white">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground uppercase">{profile?.username || "User"}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      {/* Menu Items */}
      <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-colors ${
              index < menuItems.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <item.icon className="w-6 h-6 text-green-primary" strokeWidth={1.5} />
            <span className="font-medium text-foreground">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Logout Button */}
      <div className="mx-4 mt-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-destructive rounded-2xl text-white font-semibold text-lg hover:bg-destructive/90 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
