import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const DISMISSED_KEY = "smartpay_purchase_popup_dismissed_codes";

const getDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};
const addDismissed = (code: string) => {
  const list = getDismissed();
  if (!list.includes(code)) {
    list.push(code);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
  }
};

const PurchaseSuccessPopup = () => {
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const checkPending = async (uid: string) => {
    const { data } = await supabase
      .from("promo_codes")
      .select("code")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    const dismissed = getDismissed();
    const undismissed = (data || []).find((r) => !dismissed.includes(r.code));
    if (undismissed) setPendingCode(undismissed.code);
  };

  useEffect(() => {
    if (!userId) { setPendingCode(null); return; }
    checkPending(userId);

    const channel = supabase
      .channel("purchase-popup-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "promo_codes",
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const code = payload.new?.code;
        if (code && !getDismissed().includes(code)) {
          setPendingCode(code);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleThanks = () => {
    if (pendingCode) addDismissed(pendingCode);
    setPendingCode(null);
  };

  return (
    <Dialog open={!!pendingCode} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-8 text-center [&>button.absolute]:hidden bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-green-primary flex items-center justify-center">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-green-primary">Purchased Successfully! 🎉</h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Congratulations! You have bought your promo code successfully. Check your app notifications for the code.
          </p>
          {pendingCode && (
            <div className="bg-muted px-4 py-2 rounded-lg font-bold text-foreground tracking-wide">
              {pendingCode}
            </div>
          )}
          <Button
            onClick={handleThanks}
            className="w-full py-5 bg-green-primary hover:bg-green-primary/90 text-primary-foreground font-bold text-lg rounded-full"
          >
            Thanks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseSuccessPopup;
