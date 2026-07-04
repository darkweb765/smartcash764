import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029VbAxtp984OmCYlddio40";

const KEY_JOINED = "smartpay_whatsapp_joined";
const KEY_FIRST_SEEN = "smartpay_whatsapp_first_seen";
const KEY_LAST_SHOWN = "smartpay_whatsapp_last_shown";

const SIX_MINUTES = 6 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const WhatsAppIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const JoinWhatsAppPopup = () => {
  const [open, setOpen] = useState(false);
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const joined = localStorage.getItem(KEY_JOINED) === "1";
    let firstSeen = Number(localStorage.getItem(KEY_FIRST_SEEN) || 0);

    if (!firstSeen) {
      firstSeen = now;
      localStorage.setItem(KEY_FIRST_SEEN, String(now));
    }

    const evaluate = () => {
      const t = Date.now();
      const hasJoined = localStorage.getItem(KEY_JOINED) === "1";

      // First-time: must join before it disappears
      if (!hasJoined) {
        setFirstTime(true);
        setOpen(true);
        return;
      }

      // After joining: show every 6 minutes for up to 24 hours from first_seen
      if (t - firstSeen > TWENTY_FOUR_HOURS) return;
      const lastShown = Number(localStorage.getItem(KEY_LAST_SHOWN) || 0);
      if (t - lastShown >= SIX_MINUTES) {
        setFirstTime(false);
        setOpen(true);
        localStorage.setItem(KEY_LAST_SHOWN, String(t));
      }
    };

    // Show first time immediately (or after 6 min if already joined)
    if (!joined) {
      evaluate();
    } else {
      const lastShown = Number(localStorage.getItem(KEY_LAST_SHOWN) || firstSeen);
      const elapsed = now - lastShown;
      const delay = Math.max(0, SIX_MINUTES - elapsed);
      const t0 = setTimeout(evaluate, delay);
      const interval = setInterval(evaluate, SIX_MINUTES);
      return () => {
        clearTimeout(t0);
        clearInterval(interval);
      };
    }

    const interval = setInterval(evaluate, SIX_MINUTES);
    return () => clearInterval(interval);
  }, []);

  const handleJoin = () => {
    localStorage.setItem(KEY_JOINED, "1");
    localStorage.setItem(KEY_LAST_SHOWN, String(Date.now()));
    setOpen(false);
    window.open(WHATSAPP_CHANNEL_URL, "_blank", "noopener,noreferrer");
  };

  const handleClose = () => {
    if (firstTime) return; // must join first time
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent
        className="max-w-sm rounded-2xl bg-white border-0 p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => {
          if (firstTime) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (firstTime) e.preventDefault();
        }}
      >
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center shadow-md mb-4">
            <WhatsAppIcon className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Join Official SmartPay WhatsApp Channel
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Stay updated with the latest news, promotions, and exclusive offers from SmartPay!
          </p>
          <div className="w-full flex gap-3">
            {!firstTime && (
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Close
              </Button>
            )}
            <Button
              onClick={handleJoin}
              className="flex-1 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold"
            >
              <WhatsAppIcon className="w-4 h-4 mr-1" />
              Join Now
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {firstTime ? "Join our channel to continue" : "Tap Join to follow our channel"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinWhatsAppPopup;
