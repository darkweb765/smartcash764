import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, CheckCircle, Clock, AlertCircle, Copy, Check, MessageSquare, KeyRound, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useAppContext();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (days === 0) return `Today · ${timeStr}`;
    if (days === 1) return `Yesterday · ${timeStr}`;
    return `${days}d ago · ${timeStr}`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "claim":
        return <Gift className="w-6 h-6 text-purple-icon" />;
      case "withdrawal_success":
        return <CheckCircle className="w-6 h-6 text-green-primary" />;
      case "withdrawal_pending":
        return <Clock className="w-6 h-6 text-orange-primary" />;
      case "withdrawal_activate":
        return <AlertCircle className="w-6 h-6 text-orange-primary" />;
      case "promo_purchased":
        return (
          <div className="w-10 h-10 rounded-full bg-green-primary/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-green-primary" />
          </div>
        );
      case "promo_activated":
        return (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
        );
      default:
        return <Gift className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Extract promo code from message like "...Promo Code: PEF12345"
  const extractPromoCode = (message: string): string | null => {
    const match = message.match(/PEF\d{5}/);
    return match ? match[0] : null;
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-green-primary text-primary-foreground px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-2xl">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-xl font-semibold">Notifications</span>
        </div>
        {notifications.length > 0 && (
          <button onClick={markAllAsRead} className="text-sm underline opacity-90">
            Mark all read
          </button>
        )}
      </div>

      {/* Alerts label */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-green-primary font-semibold text-base">Alerts</span>
        <div className="h-0.5 w-12 bg-green-primary mt-1" />
      </div>

      {/* Notifications List */}
      <div className="px-4 pb-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const promoCode = extractPromoCode(notification.message);
              const messageWithoutCode = promoCode
                ? notification.message.replace(promoCode, "").replace(/Promo Code:\s*$/, "Promo Code:")
                : notification.message;

              if (notification.type === "bank_credit" || notification.type === "bank_debit") {
                const meta = notification.meta || {};
                const isCredit = notification.type === "bank_credit";
                const amt = Number(meta.amount ?? notification.amount ?? 0);
                const money = new Intl.NumberFormat("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(amt);
                const stamp = new Date(notification.timestamp).toLocaleString("en-NG", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`rounded-2xl border overflow-hidden cursor-pointer ${
                      notification.read ? "bg-card border-border" : "bg-card border-green-primary/40 shadow-sm"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 flex items-center justify-between ${
                        isCredit ? "bg-green-primary" : "bg-destructive"
                      }`}
                    >
                      <span className="text-primary-foreground text-[13px] font-bold tracking-wide">
                        {isCredit ? "CREDIT ALERT" : "DEBIT ALERT"}
                      </span>
                      <span className="text-primary-foreground/90 text-[11px]">SmartPay</span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCredit ? "bg-green-primary/15" : "bg-destructive/15"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-6 h-6 text-green-primary" />
                          ) : (
                            <ArrowUpRight className="w-6 h-6 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-2xl font-extrabold ${isCredit ? "text-green-primary" : "text-destructive"}`}>
                            NGN {money}
                          </p>
                          <p className="text-sm text-foreground mt-0.5">
                            {isCredit ? "From" : "To"}{" "}
                            <span className="font-bold uppercase">{meta.sender_name || "SmartPay"}</span>
                          </p>
                          {meta.sender_bank && (
                            <p className="text-[13px] text-muted-foreground">{meta.sender_bank}</p>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-green-primary mt-2 flex-shrink-0" />
                        )}
                      </div>

                      <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                        {meta.balance_after != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">Available Balance</span>
                            <span className="text-[12px] font-bold text-foreground">
                              NGN {new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2 }).format(Number(meta.balance_after))}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-muted-foreground">Date</span>
                          <span className="text-[12px] font-medium text-foreground">{stamp}</span>
                        </div>
                        {meta.reference && (
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">Reference</span>
                            <span className="text-[12px] font-medium text-foreground">{meta.reference}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (

                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    notification.read
                      ? "bg-background border-border"
                      : "bg-green-primary/5 border-green-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      {notification.type === "promo_purchased" && promoCode ? (
                        <>
                          <p className="text-foreground font-bold text-base">Purchase Successful 🎊</p>
                          <p className="text-muted-foreground text-sm mt-0.5">
                            Your promo code is ready. Tap copy to use it.
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2 bg-green-primary/5 border border-green-primary/30 rounded-xl px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">Your promo code</span>
                              <span className="text-xl font-extrabold text-green-primary tracking-widest">{promoCode}</span>
                            </div>
                            <button
                              onClick={(e) => handleCopyCode(promoCode, e)}
                              className="shrink-0 px-3 py-2 bg-green-primary text-white rounded-lg font-semibold text-sm flex items-center gap-1.5"
                            >
                              {copiedCode === promoCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              Copy
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-foreground font-medium">
                            {promoCode ? (
                              <>
                                {messageWithoutCode.split("Promo Code:")[0]}
                                Promo Code:
                              </>
                            ) : (
                              notification.message
                            )}
                          </p>

                          {promoCode && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="bg-muted px-3 py-1.5 rounded-full text-foreground font-bold text-sm">
                                {promoCode}
                              </span>
                              <button
                                onClick={(e) => handleCopyCode(promoCode, e)}
                                className="text-green-primary"
                              >
                                {copiedCode === promoCode ? (
                                  <Check className="w-5 h-5" />
                                ) : (
                                  <Copy className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {notification.amount && !promoCode && (
                        <p className="text-green-primary font-semibold mt-1">
                          ₦{formatCurrency(notification.amount)}
                        </p>
                      )}
                      <p className="text-green-primary text-sm mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-green-primary mt-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
