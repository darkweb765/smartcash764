import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TransactionRow {
  id: string;
  account_name: string;
  bank_name: string;
  amount: number;
  status: string;
  created_at: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/welcome", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id, account_name, bank_name, amount, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) console.error("Error loading transactions:", error);
      setTransactions(data || []);
      setLoading(false);
    };

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-green-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-lg font-semibold">Transaction History</span>
      </div>

      {/* Title Card */}
      <div className="m-4 p-4 bg-muted rounded-xl border-l-4 border-green-primary">
        <h2 className="text-xl font-bold text-foreground">Transaction</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your saved transaction history
        </p>
      </div>

      {/* Transaction List */}
      <div className="px-4 pb-6 space-y-3">
        {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>}

        {!loading && transactions.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No transactions yet</p>
        )}

        {transactions.map((tx) => {
          const created = new Date(tx.created_at);
          return (
          <div
            key={tx.id}
            className="bg-card rounded-xl p-4 border border-border flex items-center justify-between"
          >
            <div>
              <p className="text-base font-semibold text-foreground">
                {tx.account_name}: <span className="text-green-primary">{tx.bank_name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {created.toLocaleDateString()} • {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {tx.status}
              </p>
            </div>
            <p className="text-base font-bold text-foreground">
              ₦{tx.amount.toLocaleString()}
            </p>
          </div>
        )})}
      </div>
    </div>
  );
};

export default Transactions;
