import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const KEY_SHOWN = "smartpay_telegram_popup_shown";

const TELEGRAM_USERNAME = "smartpay3517";
const TELEGRAM_WEB = `https://t.me/${TELEGRAM_USERNAME}`;

const openTelegramChannel = () => {
  const start = Date.now();
  let hidden = false;
  const onHide = () => {
    if (document.hidden) hidden = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("blur", onHide);

  window.location.href = `tg://resolve?domain=${TELEGRAM_USERNAME}`;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("blur", onHide);
    const drift = Date.now() - start;
    if (!hidden && !document.hidden && drift < 2500) {
      window.location.href = TELEGRAM_WEB;
    }
  }, 1500);
};

const JoinTelegramPopup = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY_SHOWN) === "1") return;
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(KEY_SHOWN, "1");
    setOpen(false);
  };

  const handleJoin = () => {
    dismiss();
    openTelegramChannel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent
        className="max-w-sm rounded-3xl border-0 p-0 overflow-hidden [&>button]:hidden shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0369a1 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)",
          }}
        />
        <div className="relative p-7 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/15 ring-4 ring-white/20 flex items-center justify-center shadow-lg mb-5">
            <Send className="w-9 h-9 text-white -rotate-12" strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2 drop-shadow">
            Join Our Telegram Channel
          </h2>
          <p className="text-sm text-white/90 mb-6 leading-relaxed">
            Get instant updates, promo code drops and important SmartPay
            announcements on Telegram.
          </p>
          <div className="w-full flex gap-3">
            <Button
              variant="ghost"
              onClick={dismiss}
              className="flex-1 rounded-xl bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:text-white font-semibold backdrop-blur-sm"
            >
              Close
            </Button>
            <Button
              onClick={handleJoin}
              className="flex-1 rounded-xl bg-white text-sky-700 hover:bg-white/90 font-semibold shadow-lg border-0"
            >
              <Send className="w-4 h-4 mr-1.5 -rotate-12" strokeWidth={2.4} />
              Join Now
            </Button>
          </div>
          <p className="text-xs text-white/80 mt-4">Shown only once</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinTelegramPopup;
