import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const JoinGroup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.open("https://whatsapp.com/channel/0029Vb5Ig8qFHWpMkbJbrR2D", "_blank");
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to WhatsApp...</p>
    </div>
  );
};

export default JoinGroup;
