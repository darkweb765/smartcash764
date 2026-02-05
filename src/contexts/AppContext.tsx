import React, { createContext, useContext, ReactNode } from "react";
import { useBalance } from "@/hooks/useBalance";
import { useNotifications, Notification } from "@/hooks/useNotifications";

interface AppContextType {
  balance: number;
  isClaimed: boolean;
  isAnimating: boolean;
  claimGift: () => Promise<boolean>;
  deductBalance: (amount: number) => void;
  notifications: Notification[];
  addNotification: (type: Notification["type"], message: string, amount?: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const balanceHook = useBalance();
  const notificationsHook = useNotifications();

  return (
    <AppContext.Provider
      value={{
        ...balanceHook,
        ...notificationsHook,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
