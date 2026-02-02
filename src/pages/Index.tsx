import Header from "@/components/Header";
import BalanceCard from "@/components/BalanceCard";
import ActionButtons from "@/components/ActionButtons";
import GiftIcon from "@/components/GiftIcon";
import ServiceGrid from "@/components/ServiceGrid";
import WhatsAppButton from "@/components/WhatsAppButton";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      <Header />
      <BalanceCard />
      <ActionButtons />
      <GiftIcon />
      <ServiceGrid />
      <WhatsAppButton />
      <BottomNav />
    </div>
  );
};

export default Index;
