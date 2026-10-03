import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col py-8 px-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-8 h-8 text-primary-foreground" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-foreground text-center mb-6">
        Privacy Policy
      </h1>

      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          SmartPay respects your privacy. This policy explains what information
          we collect and how we use it.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          Information we collect
        </h2>
        <p>
          When you create an account we store your username, email address, and
          the activity you perform in the app (such as balances, transactions,
          promo code purchases, and support messages) so the app can work for
          you on any device.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          How we use it
        </h2>
        <p>
          Your information is used only to provide SmartPay services: signing
          you in, showing your balance and history, processing purchases and
          withdrawals, and providing customer support. We do not sell your
          personal information to anyone.
        </p>
        <h2 className="text-base font-semibold text-foreground">Security</h2>
        <p>
          Your account is protected by your password and secure server-side
          authentication. Never share your password or promo codes with anyone.
        </p>
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p>
          If you have questions about this policy, contact support through the
          Help &amp; Support page in the app.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
