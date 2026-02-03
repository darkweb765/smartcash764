import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BalanceCard from "@/components/BalanceCard";
import ActionButtons from "@/components/ActionButtons";
import GiftIcon from "@/components/GiftIcon";
import ServiceGrid from "@/components/ServiceGrid";
import BottomNav from "@/components/BottomNav";
import SuccessDialog from "@/components/SuccessDialog";
import { useGiftClaim } from "@/hooks/useGiftClaim";

const Index = () => {
  const { balance, isClaimed, isAnimating, claimGift } = useGiftClaim();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Show dialog when animation completes (balance reaches target)
  useEffect(() => {
    if (isClaimed && !isAnimating && balance === 150000) {
      setShowSuccessDialog(true);
    }
  }, [isClaimed, isAnimating, balance]);

  const handleGiftClick = () => {
    if (isClaimed) {
      // If already claimed, show the success popup again
      setShowSuccessDialog(true);
    } else {
      // If not claimed, trigger the claim
      claimGift();
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative pb-24">
      <Header />
      <BalanceCard balance={balance} />
      <ActionButtons />
      <GiftIcon 
        isClaimed={isClaimed} 
        isAnimating={isAnimating} 
        onClaim={handleGiftClick} 
      />
      <ServiceGrid />
      <BottomNav />
      
      <SuccessDialog 
        open={showSuccessDialog} 
        onClose={() => setShowSuccessDialog(false)} 
      />
    </div>
  );
};

export default Index;
