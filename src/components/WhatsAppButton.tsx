import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => {
  return (
    <button className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-whatsapp-green flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-50">
      <MessageCircle className="w-7 h-7 text-primary-foreground fill-current" />
    </button>
  );
};

export default WhatsAppButton;
