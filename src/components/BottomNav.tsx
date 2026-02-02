import { Home, Wallet, User } from "lucide-react";
import { useState } from "react";

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  id: string;
}

const BottomNav = () => {
  const [activeTab, setActiveTab] = useState("home");

  const navItems: NavItem[] = [
    {
      id: "home",
      icon: <Home className="w-6 h-6" />,
      activeIcon: <Home className="w-6 h-6 fill-current" />,
      label: "Home",
    },
    {
      id: "wallet",
      icon: <Wallet className="w-6 h-6" />,
      activeIcon: <Wallet className="w-6 h-6 fill-current" />,
      label: "Wallet",
    },
    {
      id: "profile",
      icon: <User className="w-6 h-6" />,
      activeIcon: <User className="w-6 h-6 fill-current" />,
      label: "Profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
                isActive ? "text-orange-primary" : "text-muted-foreground"
              }`}
            >
              {isActive ? item.activeIcon : item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-1 bg-transparent">
        <div className="mx-auto w-32 h-1 bg-foreground rounded-full mt-1" />
      </div>
    </nav>
  );
};

export default BottomNav;
