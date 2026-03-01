import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [showAbout, setShowAbout] = useState(false);

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
    { icon: Info, label: "About SmartPay", onClick: () => setShowAbout(true) },
    { icon: MessageCircle, label: "Join WhatsApp Channel", onClick: () => window.open("https://whatsapp.com/channel/0029VbAxtp984OmCYlddio40", "_blank") },
    { icon: Shield, label: "Security", onClick: () => {} },
    { icon: HelpCircle, label: "Help & Support", onClick: () => window.open("https://wa.me/2349155306297?text=Hello%2C%20I%20contacted%20you%20from%20SmartPay.%20I%20need%20help.", "_blank") },
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
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-destructive rounded-2xl text-white font-semibold text-lg hover:bg-destructive/90 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to enter your email and password to log back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Yes, Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* About SmartPay Dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-primary">About SmartPay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground">
            <p>
              <strong>SmartPay</strong> is a rewarding platform that gives you the opportunity to earn daily rewards of <strong>₦150,000</strong> simply by claiming your daily gift on the dashboard.
            </p>
            <div>
              <h3 className="font-semibold text-base mb-1">📌 How It Works</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Register and log in to your SmartPay account.</li>
                <li>Claim your daily reward of ₦150,000 from the dashboard.</li>
                <li>To withdraw your earnings, you must purchase a promo code directly from the app.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">⚠️ Important Notice</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>You <strong>cannot withdraw</strong> without a valid promo code.</li>
                <li>Promo codes must be purchased <strong>only through the app</strong> — do not message any group admin to buy a code.</li>
                <li>If you need help, contact our support team directly on WhatsApp. Do not contact any group admin for purchases.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">💬 Need Help?</h3>
              <p className="text-muted-foreground">
                Tap <strong>"Help & Support"</strong> on the Profile page or contact us on WhatsApp for assistance.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Profile;
