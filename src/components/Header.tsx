import { Bell } from "lucide-react";

const Header = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
            alt="User avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-lg font-semibold text-foreground">Hi, User</span>
      </div>
      <div className="relative">
        <Bell className="w-7 h-7 text-foreground" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
          <span className="text-[10px] text-primary-foreground font-bold">1</span>
        </span>
      </div>
    </div>
  );
};

export default Header;
