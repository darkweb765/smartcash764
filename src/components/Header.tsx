import { Bell, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const navigate = useNavigate();
  const { unreadCount } = useAppContext();
  const [username, setUsername] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setUsername(data.username || "User");
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-green-primary flex items-center justify-center"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-green-primary" strokeWidth={1.5} />
          )}
        </button>
        <span className="text-lg font-semibold text-foreground">Hi, {username}</span>
      </div>
      <button 
        onClick={() => navigate("/notifications")}
        className="relative"
      >
        <Bell className="w-7 h-7 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
            <span className="text-[10px] text-primary-foreground font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>
    </div>
  );
};

export default Header;
