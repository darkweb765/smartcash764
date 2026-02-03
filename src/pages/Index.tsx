import Header from "@/components/Header";
import BalanceCard from "@/components/BalanceCard";
import ActionButtons from "@/components/ActionButtons";
import GiftIcon from "@/components/GiftIcon";
import ServiceGrid from "@/components/ServiceGrid";
import BottomNav from "@/components/BottomNav";
import { useGiftClaim } from "@/hooks/useGiftClaim";

const Index = () => {
  const { balance, isClaimed, isAnimating, claimGift } = useGiftClaim();

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-24">
      <Header />
      <BalanceCard balance={balance} />
      <ActionButtons />
      <GiftIcon 
        isClaimed={isClaimed} 
        isAnimating={isAnimating} 
        onClaim={claimGift} 
      />
      <ServiceGrid />
      <BottomNav />
    </div>
  );
};

export default Index;
