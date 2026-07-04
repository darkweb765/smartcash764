import { useState } from "react";
import Header from "@/components/Header";
import BalanceCard from "@/components/BalanceCard";
import ActionButtons from "@/components/ActionButtons";
import GiftIcon from "@/components/GiftIcon";
import ServiceGrid from "@/components/ServiceGrid";
import BottomNav from "@/components/BottomNav";
import SuccessDialog from "@/components/SuccessDialog";
import JoinWhatsAppPopup from "@/components/JoinWhatsAppPopup";
import { useAppContext } from "@/contexts/AppContext";
import { playSuccessSound } from "@/utils/sounds";

const Index = () => {
  const { balance, isClaimed, isAnimating, claimGift, addNotification } = useAppContext();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleGiftClick = async () => {
    if (isClaimed) {
      // If already claimed, show the success popup again
      setShowSuccessDialog(true);
    } else {
      // If not claimed, trigger the claim
      const success = await claimGift();
      if (success) {
        // Play success sound
        playSuccessSound();
        // Add notification
        addNotification("claim", "Claim reward successfully 🎉", 150000);
        // Show success dialog
        setShowSuccessDialog(true);
      }
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
