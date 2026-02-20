import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ServiceItem {
  icon: React.ReactNode;
  label: string;
}

const ServiceGrid = () => {
  const navigate = useNavigate();
  const [showPromoDialog, setShowPromoDialog] = useState(false);

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
      icon: <Zap className="w-7 h-7" strokeWidth={1.5} />,
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
    <>
      <div className="bg-card mx-4 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3">
          {services.map((service, index) => (
            <button
              key={index}
              onClick={() => setShowPromoDialog(true)}
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

      {/* Promo Code Required Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6 text-center bg-background [&>button.absolute]:hidden">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Access Required</h2>
          <p className="text-muted-foreground text-sm mb-5">
            You need to buy a <span className="font-bold text-foreground">Promo Code</span> to access this service. Purchase your promo code to unlock all services.
          </p>
          <Button
            onClick={() => {
              setShowPromoDialog(false);
              navigate("/buy-promo");
            }}
            className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-semibold rounded-xl mb-3"
          >
            Buy Promo Code
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPromoDialog(false)}
            className="w-full py-5 rounded-xl"
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceGrid;
