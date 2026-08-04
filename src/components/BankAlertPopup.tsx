import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownLeft, ArrowUpRight, X } from "lucide-react";

interface BankAlert {
  id: string;
  direction: "credit" | "debit";
  amount: number;
  senderName: string;
  senderBank: string;
  reference: string;
  balanceAfter?: number;
  createdAt: number;
}

const naira = (v: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const mapAlert = (row: any): BankAlert | null => {
  if (row?.type !== "bank_credit" && row?.type !== "bank_debit") return null;
  const meta = (row.meta || {}) as Record<string, any>;
  return {
    id: row.id,
    direction: row.type === "bank_credit" ? "credit" : "debit",
    amount: Number(meta.amount ?? row.amount ?? 0),
    senderName: String(meta.sender_name || "SmartPay"),
    senderBank: String(meta.sender_bank || "SmartPay"),
    reference: String(meta.reference || ""),
    balanceAfter: meta.balance_after != null ? Number(meta.balance_after) : undefined,
    createdAt: new Date(row.created_at || Date.now()).getTime(),
  };
};

const BankAlertPopup = () => {
  const [queue, setQueue] = useState<BankAlert[]>([]);
  const [visible, setVisible] = useState(false);

  const current = queue[0];

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setQueue((prev) => prev.slice(1)), 250);
  }, []);

  useEffect(() => {
    let channel: any;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel("bank-alerts-" + user.id)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const alert = mapAlert(payload.new);
            if (!alert) return;
            setQueue((prev) => (prev.some((a) => a.id === alert.id) ? prev : [...prev, alert]));
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    setVisible(false);
    const show = setTimeout(() => setVisible(true), 30);
    const hide = setTimeout(() => dismiss(), 9000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [current, dismiss]);

  if (!current) return null;

  const isCredit = current.direction === "credit";
  const time = new Date(current.createdAt).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3 pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border overflow-hidden transition-all duration-300 ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-green-primary flex items-center justify-center">
              <span className="text-[10px] font-black text-primary-foreground">SP</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              SmartPay
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">now</span>
            <button onClick={dismiss} aria-label="Dismiss alert">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-3 pb-3 flex gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCredit ? "bg-green-primary/15" : "bg-destructive/15"
            }`}
          >
            {isCredit ? (
              <ArrowDownLeft className="w-5 h-5 text-green-primary" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-destructive" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {isCredit ? "Credit Alert" : "Debit Alert"}
            </p>
            <p className="text-[13px] text-foreground leading-snug mt-0.5">
              <span className={isCredit ? "font-extrabold text-green-primary" : "font-extrabold text-destructive"}>
                NGN {naira(current.amount)}
              </span>{" "}
              {isCredit ? "from" : "to"}{" "}
              <span className="font-semibold uppercase">{current.senderName}</span>
              {current.senderBank ? ` / ${current.senderBank}` : ""}
            </p>
            {current.balanceAfter != null && (
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Bal: NGN {naira(current.balanceAfter)}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {time}
              {current.reference ? ` · Ref ${current.reference}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankAlertPopup;
