import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const transactions = [
  { name: "Miracle John", bank: "opay", amount: 150000, date: "2026-02-18", time: "10:32 AM" },
  { name: "Fidelis Junior", bank: "opay", amount: 150000, date: "2026-02-17", time: "09:15 AM" },
  { name: "Abel Samuel", bank: "palmpay", amount: 150000, date: "2026-02-17", time: "08:45 AM" },
  { name: "Jeremiah Abdul", bank: "Palmpay", amount: 150000, date: "2026-02-16", time: "03:20 PM" },
  { name: "Israel Sanusi", bank: "palmpay", amount: 150000, date: "2026-02-16", time: "01:10 PM" },
  { name: "Steve David", bank: "opay", amount: 150000, date: "2026-02-15", time: "11:05 AM" },
  { name: "Promise Tochukwu", bank: "palmpay", amount: 150000, date: "2026-02-15", time: "07:30 AM" },
  { name: "Promise Ugo", bank: "palmpay", amount: 150000, date: "2026-02-14", time: "04:50 PM" },
  { name: "Tina Abdul", bank: "opay", amount: 150000, date: "2026-02-14", time: "02:22 PM" },
  { name: "Grace Emeka", bank: "opay", amount: 150000, date: "2026-02-13", time: "12:00 PM" },
  { name: "Samuel Eze", bank: "palmpay", amount: 150000, date: "2026-02-13", time: "09:40 AM" },
  { name: "Joy Adebayo", bank: "opay", amount: 150000, date: "2026-02-12", time: "06:15 PM" },
];

const Transactions = () => {
  const navigate = useNavigate();

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
          This are transaction from the app user
        </p>
      </div>

      {/* Transaction List */}
      <div className="px-4 pb-6 space-y-3">
        {transactions.map((tx, index) => (
          <div
            key={index}
            className="bg-card rounded-xl p-4 border border-border flex items-center justify-between"
          >
            <div>
              <p className="text-base font-semibold text-foreground">
                {tx.name}: <span className="text-green-primary">{tx.bank}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tx.date} • {tx.time}
              </p>
            </div>
            <p className="text-base font-bold text-foreground">
              ₦{tx.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transactions;
