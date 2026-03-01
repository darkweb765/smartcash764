interface BalanceCardProps {
  balance: number;
}

const BalanceCard = ({ balance }: BalanceCardProps) => {
  const formattedBalance = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);

  return (
    <div className="mx-4 rounded-2xl bg-green-primary p-5 py-10 flex flex-col items-center justify-center">
      <p className="text-primary-foreground/90 text-sm mb-1">Available Balance</p>
      <p className="text-primary-foreground text-4xl font-bold">₦{formattedBalance}</p>
    </div>
  );
};

export default BalanceCard;
