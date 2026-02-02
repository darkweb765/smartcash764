import { 
  Phone, 
  Wifi, 
  Monitor, 
  Globe, 
  CreditCard,
  AtSign,
  Gift,
  Users
} from "lucide-react";

interface ServiceItem {
  icon: React.ReactNode;
  label: string;
}

const ServiceGrid = () => {
  const services: ServiceItem[] = [
    {
      icon: <Phone className="w-7 h-7" strokeWidth={1.5} />,
      label: "Airtime",
    },
    {
      icon: <Wifi className="w-7 h-7" strokeWidth={1.5} />,
      label: "Data",
    },
    {
      icon: <Monitor className="w-7 h-7" strokeWidth={1.5} />,
      label: "CableTv",
    },
    {
      icon: <Monitor className="w-7 h-7" strokeWidth={1.5} />,
      label: "Electricity",
    },
    {
      icon: <Globe className="w-7 h-7" strokeWidth={1.5} />,
      label: "Internet",
    },
    {
      icon: <CreditCard className="w-7 h-7" strokeWidth={1.5} />,
      label: "Virtual Card",
    },
    {
      icon: <AtSign className="w-7 h-7" strokeWidth={1.5} />,
      label: "Betting",
    },
    {
      icon: <Gift className="w-7 h-7" strokeWidth={1.5} />,
      label: "Giftcard",
    },
    {
      icon: <Users className="w-7 h-7" strokeWidth={1.5} />,
      label: "Gift User",
    },
  ];

  return (
    <div className="bg-card mx-4 rounded-2xl p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-3">
        {services.map((service, index) => (
          <button
            key={index}
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
