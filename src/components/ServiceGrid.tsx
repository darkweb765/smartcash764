import { useNavigate } from "react-router-dom";
import { 
  Phone, 
  Wifi, 
  Monitor, 
  Zap,
  Globe, 
  CreditCard,
  AtSign,
  Gift,
  Users
} from "lucide-react";

interface ServiceItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const ServiceGrid = () => {
  const navigate = useNavigate();

  const services: ServiceItem[] = [
    { icon: <Phone className="w-7 h-7" strokeWidth={1.5} />, label: "Airtime", path: "/airtime" },
    { icon: <Wifi className="w-7 h-7" strokeWidth={1.5} />, label: "Data", path: "/data" },
    { icon: <Monitor className="w-7 h-7" strokeWidth={1.5} />, label: "CableTv", path: "/cable-tv" },
    { icon: <Zap className="w-7 h-7" strokeWidth={1.5} />, label: "Electricity", path: "/electricity" },
    { icon: <Globe className="w-7 h-7" strokeWidth={1.5} />, label: "Internet", path: "/internet" },
    { icon: <CreditCard className="w-7 h-7" strokeWidth={1.5} />, label: "Virtual Card", path: "/buy-promo" },
    { icon: <AtSign className="w-7 h-7" strokeWidth={1.5} />, label: "Betting", path: "/betting" },
    { icon: <Gift className="w-7 h-7" strokeWidth={1.5} />, label: "Giftcard", path: "/buy-promo" },
    { icon: <Users className="w-7 h-7" strokeWidth={1.5} />, label: "Gift User", path: "/buy-promo" },
  ];

  return (
    <div className="bg-card mx-4 rounded-2xl p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-3">
        {services.map((service, index) => (
          <button
            key={index}
            onClick={() => navigate(service.path)}
            className="flex flex-col items-center gap-2 py-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <span className="text-muted-foreground">{service.icon}</span>
            <span className="text-xs text-foreground font-medium">
              {service.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceGrid;
