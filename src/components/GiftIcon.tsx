import { Gift } from "lucide-react";

const GiftIcon = () => {
  return (
    <div className="flex justify-center py-6">
      <div className="w-20 h-20 rounded-full bg-purple-light flex items-center justify-center">
        <Gift className="w-10 h-10 text-purple-icon" />
      </div>
    </div>
  );
};

export default GiftIcon;
