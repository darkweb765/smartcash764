import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useAppContext();

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
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
          <button
            onClick={markAllAsRead}
            className="text-sm underline opacity-90"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
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
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium">
                      {notification.message}
                    </p>
                    {notification.amount && (
                      <p className="text-green-primary font-semibold mt-1">
                        ₦{formatCurrency(notification.amount)}
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-green-primary mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
