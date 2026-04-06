import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, AlertTriangle, Phone, Mail, HelpCircle, ChevronDown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HelpSupport = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("User");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setUsername(data.username);
      }
    };
    fetchUser();
  }, []);

  const whatsappUrl = "https://wa.me/2349155306297?text=Hello%2C%20I%20am%20contacting%20you%20from%20Smart%20Pay.%20I%20need%20help.";
  const whatsappChannel = "https://whatsapp.com/channel/0029VbAxtp984OmCYlddio40";

  const contactOptions = [
    {
      icon: MessageSquare,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      title: "Live Chat",
      subtitle: "Instant response",
      onClick: () => window.open(whatsappUrl, "_blank"),
    },
    {
      icon: AlertTriangle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      title: "Report Issue",
      subtitle: "Report a problem",
      onClick: () => navigate("/report-issue"),
    },
    {
      icon: Phone,
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-700",
      title: "Call Support",
      subtitle: "Talk to agent",
      onClick: () => window.open("tel:+2349155306297"),
    },
    {
      icon: Mail,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      title: "Email Us",
      subtitle: "Get ticket ID",
      onClick: () => window.open(whatsappUrl, "_blank"),
    },
  ];

  const faqs = [
    {
      question: "How can I buy promo code?",
      answer: "To buy a promo code, go to your dashboard and tap on 'Buy Promo Code'. Follow the payment instructions and your promo code will be sent to your notifications after admin verification.",
    },
    {
      question: "How can I withdraw my reward?",
      answer: "Go to the Withdraw page, enter your bank details and your promo code. Once your code is activated by admin, your withdrawal will be processed.",
    },
    {
      question: "Do I need to refer anybody before withdrawing my money?",
      answer: "No, you do not need to refer anyone. Simply purchase your promo code through the app and use it to withdraw your earnings.",
    },
  ];

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col">
      {/* Green Header */}
      <div className="bg-green-primary text-white px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold flex-1 text-center pr-6">Help & Support</span>
        </div>
        <h1 className="text-2xl font-bold mt-2">Hello, {username}</h1>
        <p className="text-white/80 text-sm mt-1">
          How can we assist you today? Select an option below or browse FAQs.
        </p>
      </div>

      {/* Contact Us */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-3">Contact Us</h2>
        <div className="grid grid-cols-2 gap-3">
          {contactOptions.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="bg-card border border-border rounded-xl p-4 text-left hover:bg-accent/50 transition-colors"
            >
              <div className={`w-12 h-12 rounded-full ${item.iconBg} flex items-center justify-center mb-3`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <p className="font-semibold text-foreground text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-3">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center gap-3 p-4"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground text-left flex-1">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
              </button>
              {openFaq === index && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground ml-13">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Join Community Button */}
      <div className="px-4 pb-6 mt-auto">
        <button
          onClick={() => window.open(whatsappChannel, "_blank")}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#1a3a2a] rounded-xl text-white font-semibold text-base"
        >
          <Users className="w-5 h-5" />
          Join Our Community
        </button>
      </div>
    </div>
  );
};

export default HelpSupport;
