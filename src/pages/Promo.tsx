import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { openWhatsAppChannel } from "@/utils/openWhatsApp";
import { ArrowLeft, MessageCircle, ShoppingCart, Info, Headphones } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Promo = () => {
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);

  const menuItems = [
    {
      icon: MessageCircle,
      label: "Join WhatsApp Channel",
      color: "bg-green-100",
      iconColor: "text-green-600",
      onClick: openWhatsAppChannel,
    },
    {
      icon: ShoppingCart,
      label: "Buy Promo Code",
      color: "bg-yellow-100",
      iconColor: "text-yellow-600",
      onClick: () => navigate("/buy-promo"),
    },
    {
      icon: Info,
      label: "About SmartPay",
      color: "bg-blue-100",
      iconColor: "text-blue-600",
      onClick: () => navigate("/about-smartpay"),
    },
    {
      icon: Headphones,
      label: "Contact Support",
      color: "bg-purple-100",
      iconColor: "text-purple-600",
      onClick: () => navigate("/help-support"),
    },
  ];

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="bg-green-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-lg font-semibold">Promo & Support</span>
      </div>

      {/* WhatsApp Info */}
      <div className="m-4 p-5 bg-muted rounded-xl border-l-4 border-green-primary text-center">
        <MessageCircle className="w-12 h-12 text-green-primary mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground">Join Our WhatsApp Channel</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Join our WhatsApp channel for updates and announcements about SmartPay
        </p>
      </div>

      {/* Menu Buttons */}
      <div className="px-4 space-y-3">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-accent/50 transition-colors"
          >
            <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center`}>
              <item.icon className={`w-6 h-6 ${item.iconColor}`} />
            </div>
            <span className="font-semibold text-foreground">{item.label}</span>
          </button>
        ))}
      </div>

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
                <li>If you need help, contact our support team directly on WhatsApp.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">💬 Need Help?</h3>
              <p className="text-muted-foreground">
                Tap <strong>"Contact Support"</strong> or reach us on WhatsApp for assistance.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Promo;
