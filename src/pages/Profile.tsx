import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { openWhatsAppChannel } from "@/utils/openWhatsApp";
import { ArrowLeft, User, Settings, ShoppingCart, Info, MessageCircle, Shield, HelpCircle, LogOut, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setEmail(user.email || "");
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error("Error fetching profile:", error);
      else if (data) setProfile(data);
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
    { icon: Settings, label: "Account Settings", onClick: () => navigate("/account-settings") },
    { icon: ShoppingCart, label: "Buy Promo Code", onClick: () => navigate("/buy-promo") },
    { icon: Info, label: "About SmartPay", onClick: () => navigate("/about-smartpay") },
    { icon: MessageCircle, label: "Join WhatsApp Channel", onClick: openWhatsAppChannel },
    { icon: Shield, label: "Security", onClick: () => navigate("/security") },
    { icon: HelpCircle, label: "Help & Support", onClick: () => navigate("/help-support") },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col pb-20">
        <div className="bg-green-primary text-primary-foreground p-4 flex items-center gap-3">
          <ArrowLeft className="w-6 h-6 opacity-60" />
          <span className="text-lg font-semibold">Profile</span>
        </div>
        <div className="mx-4 mt-4 bg-card rounded-2xl p-6 border border-border animate-pulse">
          <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4" />
          <div className="h-5 bg-muted rounded w-1/2 mx-auto mb-2" />
          <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col pb-20">
      <div className="bg-green-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")}><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-lg font-semibold">Profile</span>
      </div>

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

      <div className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-colors ${index < menuItems.length - 1 ? "border-b border-border" : ""}`}
          >
            <item.icon className="w-6 h-6 text-green-primary" strokeWidth={1.5} />
            <span className="font-medium text-foreground">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-4 mt-6">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-destructive rounded-2xl text-white font-semibold text-lg hover:bg-destructive/90 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>You will need to enter your email and password to log back in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Yes, Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <BottomNav />
    </div>
  );
};

export default Profile;
