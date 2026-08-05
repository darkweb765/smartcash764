import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { openWhatsAppChannel } from "@/utils/openWhatsApp";

const JoinGroup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    openWhatsAppChannel();
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Opening WhatsApp...</p>
    </div>
  );
};

export default JoinGroup;
