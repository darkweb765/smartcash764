import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, HelpCircle, Info, DollarSign, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

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
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/welcome");
    }
  };

  const menuItems = [
    {
      icon: User,
      title: "Profile Information",
      subtitle: "View and edit your profile details",
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Get help with using SmartPay",
      color: "bg-cyan-100",
      iconColor: "text-cyan-600",
    },
    {
      icon: Info,
      title: "About",
      subtitle: "Learn more about SmartPay",
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: DollarSign,
      title: "Refer & Earn",
      subtitle: "Invite friends and earn ₦5,000 per referral",
      color: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
        <button onClick={() => navigate("/dashboard")} className="p-1">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center py-8">
        <div className="w-28 h-28 rounded-full bg-purple-100 border-4 border-purple-200 flex items-center justify-center mb-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-14 h-14 text-purple-400" strokeWidth={1.5} />
          )}
        </div>
        <p className="text-muted-foreground text-sm">Tap to change profile picture</p>
      </div>

      {/* Menu Items */}
      <div className="flex-1 px-4 space-y-3">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-accent/50 transition-colors"
          >
            <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center`}>
              <item.icon className={`w-6 h-6 ${item.iconColor}`} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Logout Button */}
      <div className="px-4 py-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-destructive rounded-xl text-destructive font-medium hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
