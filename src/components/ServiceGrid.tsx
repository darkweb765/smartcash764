import { 
  ArrowLeftRight, 
  Phone, 
  Send, 
  Zap, 
  Gift, 
  Tv, 
  CreditCard,
  Wallet,
  Smartphone
} from "lucide-react";

interface ServiceItem {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  iconColor: string;
}

const ServiceGrid = () => {
  const services: ServiceItem[] = [
    {
      icon: <ArrowLeftRight className="w-6 h-6" strokeWidth={2.5} />,
      label: "Data Bundle",
      bgColor: "bg-card",
      iconColor: "text-foreground",
    },
    {
      icon: (
        <div className="relative">
          <Phone className="w-5 h-5" strokeWidth={2.5} />
          <span className="absolute -top-1 -right-2 text-[8px] font-bold">₦</span>
        </div>
      ),
      label: "Airtime Conversion",
      bgColor: "bg-card",
      iconColor: "text-foreground",
    },
    {
      icon: <Send className="w-6 h-6" strokeWidth={2.5} />,
      label: "Airtime",
      bgColor: "bg-purple-light",
      iconColor: "text-purple-icon",
    },
    {
      icon: <Zap className="w-6 h-6 fill-current" strokeWidth={0} />,
      label: "Electricity",
      bgColor: "bg-card",
      iconColor: "text-orange-primary",
    },
    {
      icon: <Gift className="w-6 h-6" strokeWidth={2.5} />,
      label: "Refer & Earn",
      bgColor: "bg-card border border-destructive",
      iconColor: "text-destructive",
    },
    {
      icon: <Tv className="w-6 h-6" strokeWidth={2.5} />,
      label: "Cable",
      bgColor: "bg-card",
      iconColor: "text-orange-primary",
    },
    {
      icon: (
        <div className="w-6 h-6 rounded-full border-2 border-orange-primary flex items-center justify-center">
          <span className="text-[6px] font-bold text-orange-primary">PASS</span>
        </div>
      ),
      label: "Exam",
      bgColor: "bg-card",
      iconColor: "text-foreground",
    },
    {
      icon: <CreditCard className="w-6 h-6" strokeWidth={2.5} />,
      label: "Data Card",
      bgColor: "bg-card",
      iconColor: "text-orange-primary",
    },
    {
      icon: <Wallet className="w-6 h-6" strokeWidth={2.5} />,
      label: "Recharge Card",
      bgColor: "bg-card",
      iconColor: "text-orange-primary",
    },
    {
      icon: <Smartphone className="w-6 h-6" strokeWidth={2.5} />,
      label: "Virtual Card",
      bgColor: "bg-card",
      iconColor: "text-orange-primary",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 px-4 pb-24">
      {services.map((service, index) => (
        <button
          key={index}
          className="flex flex-col items-center gap-2 group"
        >
          <div
            className={`w-14 h-14 rounded-xl ${service.bgColor} flex items-center justify-center shadow-sm transition-transform group-hover:scale-105`}
          >
            <span className={service.iconColor}>{service.icon}</span>
          </div>
          <span className="text-xs text-center text-muted-foreground leading-tight">
            {service.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ServiceGrid;
