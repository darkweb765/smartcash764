import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const transactions = [
  { name: "Emmanuel Okafor", bank: "Access Bank", amount: 150000, date: "2026-02-19", time: "09:10 AM" },
  { name: "Chibuike Nwosu", bank: "GTBank", amount: 150000, date: "2026-02-19", time: "08:30 AM" },
  { name: "Victory Nnamdi", bank: "First Bank", amount: 150000, date: "2026-02-18", time: "11:45 AM" },
  { name: "Miracle John", bank: "Opay", amount: 150000, date: "2026-02-18", time: "10:32 AM" },
  { name: "Fidelis Junior", bank: "Palmpay", amount: 150000, date: "2026-02-17", time: "09:15 AM" },
  { name: "Abel Samuel", bank: "Zenith Bank", amount: 150000, date: "2026-02-17", time: "08:45 AM" },
  { name: "Chukwuemeka Eze", bank: "UBA", amount: 150000, date: "2026-02-17", time: "07:20 AM" },
  { name: "Jeremiah Abdul", bank: "Access Bank", amount: 150000, date: "2026-02-16", time: "03:20 PM" },
  { name: "Israel Sanusi", bank: "Moniepoint MFB", amount: 150000, date: "2026-02-16", time: "01:10 PM" },
  { name: "Oluwaseun Adeyemi", bank: "GTBank", amount: 150000, date: "2026-02-16", time: "10:55 AM" },
  { name: "Steve David", bank: "First Bank", amount: 150000, date: "2026-02-15", time: "11:05 AM" },
  { name: "Promise Tochukwu", bank: "Opay", amount: 150000, date: "2026-02-15", time: "07:30 AM" },
  { name: "Nkechi Obiora", bank: "Zenith Bank", amount: 150000, date: "2026-02-15", time: "06:15 AM" },
  { name: "Promise Ugo", bank: "Palmpay", amount: 150000, date: "2026-02-14", time: "04:50 PM" },
  { name: "Tina Abdul", bank: "UBA", amount: 150000, date: "2026-02-14", time: "02:22 PM" },
  { name: "Bright Okonkwo", bank: "Access Bank", amount: 150000, date: "2026-02-14", time: "12:40 PM" },
  { name: "Grace Emeka", bank: "Moniepoint MFB", amount: 150000, date: "2026-02-13", time: "12:00 PM" },
  { name: "Samuel Eze", bank: "First Bank", amount: 150000, date: "2026-02-13", time: "09:40 AM" },
  { name: "Adaeze Nnaji", bank: "GTBank", amount: 150000, date: "2026-02-13", time: "08:05 AM" },
  { name: "Joy Adebayo", bank: "Zenith Bank", amount: 150000, date: "2026-02-12", time: "06:15 PM" },
  { name: "Kingsley Obi", bank: "UBA", amount: 150000, date: "2026-02-12", time: "04:30 PM" },
  { name: "Blessing Nwofor", bank: "Opay", amount: 150000, date: "2026-02-12", time: "02:00 PM" },
  { name: "Daniel Amaechi", bank: "Access Bank", amount: 150000, date: "2026-02-11", time: "05:45 PM" },
  { name: "Precious Okoro", bank: "Palmpay", amount: 150000, date: "2026-02-11", time: "03:10 PM" },
  { name: "Uchenna Chukwu", bank: "First Bank", amount: 150000, date: "2026-02-11", time: "11:25 AM" },
  { name: "Favour Ikechukwu", bank: "GTBank", amount: 150000, date: "2026-02-10", time: "07:50 PM" },
  { name: "Solomon Igwe", bank: "Moniepoint MFB", amount: 150000, date: "2026-02-10", time: "05:20 PM" },
  { name: "Chiamaka Onwu", bank: "Zenith Bank", amount: 150000, date: "2026-02-10", time: "01:35 PM" },
  { name: "Goodluck Effiong", bank: "UBA", amount: 150000, date: "2026-02-09", time: "10:10 AM" },
  { name: "Ruth Okonkwo", bank: "Access Bank", amount: 150000, date: "2026-02-09", time: "08:40 AM" },
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
