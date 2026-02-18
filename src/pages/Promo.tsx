import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, ShoppingCart, Info, Headphones } from "lucide-react";

const Promo = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      icon: MessageCircle,
      label: "Join WhatsApp Group",
      color: "bg-green-100",
      iconColor: "text-green-600",
      onClick: () => window.open("https://wa.me/", "_blank"),
    },
    {
      icon: ShoppingCart,
      label: "Buy Promo Code",
      color: "bg-yellow-100",
      iconColor: "text-yellow-600",
      onClick: () => window.open("https://wa.me/", "_blank"),
    },
    {
      icon: Info,
      label: "About SmartPay",
      color: "bg-blue-100",
      iconColor: "text-blue-600",
      onClick: () => {},
    },
    {
      icon: Headphones,
      label: "Contact Support",
      color: "bg-purple-100",
      iconColor: "text-purple-600",
      onClick: () => window.open("https://wa.me/", "_blank"),
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
        <h2 className="text-lg font-bold text-foreground">Join Our WhatsApp Group</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Join our WhatsApp group for more information about SmartPay
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
    </div>
  );
};

export default Promo;
