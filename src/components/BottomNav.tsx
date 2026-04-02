import { Home, CreditCard, User } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  id: string;
  path?: string;
}

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveTab = () => {
    if (location.pathname === "/wallet") return "wallet";
    if (location.pathname === "/profile") return "profile";
    return "home";
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const navItems: NavItem[] = [
    {
      id: "home",
      icon: <Home className="w-6 h-6" strokeWidth={1.5} />,
      activeIcon: <Home className="w-6 h-6 fill-current" strokeWidth={1.5} />,
      label: "Home",
      path: "/dashboard",
    },
    {
      id: "wallet",
      icon: <CreditCard className="w-6 h-6" strokeWidth={1.5} />,
      activeIcon: <CreditCard className="w-6 h-6" strokeWidth={1.5} />,
      label: "Wallet",
      path: "/wallet",
    },
    {
      id: "profile",
      icon: <User className="w-6 h-6" strokeWidth={1.5} />,
      activeIcon: <User className="w-6 h-6" strokeWidth={1.5} />,
      label: "Profile",
      path: "/profile",
    },
  ];

  const handleNavClick = (item: NavItem) => {
    setActiveTab(item.id);
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 max-w-md mx-auto">
      <div className="flex items-center justify-around py-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center gap-1 px-8 py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {isActive ? item.activeIcon : item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-1 bg-transparent pb-1">
        <div className="mx-auto w-32 h-1 bg-foreground rounded-full" />
      </div>
    </nav>
  );
};

export default BottomNav;
