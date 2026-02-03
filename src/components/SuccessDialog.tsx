import { CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
}

const SuccessDialog = ({ open, onClose }: SuccessDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-8 text-center [&>button]:hidden">
        <div className="flex flex-col items-center gap-4">
          {/* Green Checkmark Circle */}
          <div className="w-20 h-20 rounded-full border-4 border-green-primary flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-primary" strokeWidth={2} />
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-medium text-foreground">
            Good News! Earning Completed
          </h2>
          
          {/* Success Badge */}
          <p className="text-2xl font-bold text-foreground">
            SUCCESS
          </p>
          
          {/* Subtitle */}
          <p className="text-muted-foreground text-base">
            Kindly Withdraw Fund to Your Bank
          </p>
          
          {/* OKAY Button */}
          <Button 
            onClick={onClose}
            className="w-full mt-2 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold py-6 text-lg rounded-lg"
          >
            OKAY
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessDialog;
