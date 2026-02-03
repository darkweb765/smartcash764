import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftIconProps {
  isClaimed: boolean;
  isAnimating: boolean;
  onClaim: () => void;
}

const GiftIcon = ({ isClaimed, isAnimating, onClaim }: GiftIconProps) => {
  // Clickable when not animating (can click when claimed to show popup)
  const isClickable = !isAnimating;

  return (
    <div className="flex justify-center my-6">
      <button
        onClick={isClickable ? onClaim : undefined}
        disabled={!isClickable}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          isClickable && "cursor-pointer hover:scale-110 active:scale-95",
          !isClickable && "cursor-default",
          isClaimed 
            ? "bg-muted shadow-md" 
            : "bg-purple-light shadow-lg shadow-purple-icon/40",
          isAnimating && "animate-pulse"
        )}
        aria-label={isClaimed ? "Gift already claimed" : "Claim your gift"}
      >
        <Gift 
          className={cn(
            "w-10 h-10 transition-colors duration-300",
            isClaimed ? "text-muted-foreground" : "text-purple-icon"
          )} 
          strokeWidth={1.5} 
        />
      </button>
    </div>
  );
};

export default GiftIcon;
