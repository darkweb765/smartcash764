import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, ShieldCheck, AlertTriangle, Wallet, HeadphonesIcon } from "lucide-react";

const AboutSmartPay = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="bg-green-primary text-white px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold flex-1 text-center pr-6">About Smart Pay</span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-8">
        {/* About Section */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-green-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">About Smart Pay</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Smart Pay is an application built by <strong className="text-foreground">Smart Cash Bank</strong>. It allows users to claim up to <strong className="text-foreground">₦150,000</strong> in bonuses. The main purpose of Smart Pay is to provide services such as:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Buying data and airtime</li>
            <li>Buying and selling gift cards</li>
            <li>Earning rewards and bonuses</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Users can withdraw their earnings and also fund their Smart Pay wallet directly from their bank after completing withdrawals.
          </p>
        </div>

        {/* Promo Code Section */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Promo Code</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Promo codes are required to activate and identify each Smart Pay user. Users must purchase a promo code within the app.
          </p>
          <h3 className="font-semibold text-foreground text-sm mt-4 mb-2">How to Buy a Promo Code:</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Click on <strong className="text-foreground">"Buy Promo Code"</strong> from the Withdrawal Page or Profile Page</li>
            <li>Enter your full name and email address</li>
            <li>Click <strong className="text-foreground">Pay</strong></li>
            <li>Account details will be generated</li>
            <li>Copy the account details and make payment using your bank</li>
            <li>After payment, click <strong className="text-foreground">"I have made this bank transfer"</strong> to verify</li>
            <li>Once confirmed, the promo code will be sent to you via app notifications</li>
          </ol>
        </div>

        {/* Important Payment Notice */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-red-600">Important Payment Notice</h2>
          </div>
          <ul className="space-y-2 text-sm text-red-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>Do <strong>NOT</strong> use Opay for payments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>Opay services are currently experiencing issues</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>Payments made through Opay may not be confirmed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✅</span>
              <span>Please use <strong>POS or any other bank transfer</strong> (except Opay)</span>
            </li>
          </ul>
        </div>

        {/* Wallet & Features After Withdrawal */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">After Withdrawal</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">After you withdraw your rewards, you will be able to:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Fund your wallet</li>
            <li>Transfer money to any bank account</li>
            <li>Buy airtime and data</li>
            <li>Buy and sell gift cards</li>
          </ul>
        </div>

        {/* Support */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <HeadphonesIcon className="w-5 h-5 text-green-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Support</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you need help, use the <strong className="text-foreground">"Report Issue"</strong> feature to describe your problem and attach a screenshot. You can also email us at <strong className="text-foreground">supporstmart@gmail.com</strong> for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutSmartPay;
