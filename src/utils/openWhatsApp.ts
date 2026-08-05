export const WHATSAPP_CHANNEL_ID = "0029VbAxtp984OmCYlddio40";

export const WHATSAPP_CHANNEL_URL = `https://whatsapp.com/channel/${WHATSAPP_CHANNEL_ID}`;

const FALLBACK_DELAY = 1500;

/** Try a native deep link first, fall back to the https link if the app never opens. */
const openWithFallback = (deepLink: string, webUrl: string) => {
  let hidden = false;
  const onHide = () => {
    if (document.hidden) hidden = true;
  };
  document.addEventListener("visibilitychange", onHide);

  const timer = window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!hidden && !document.hidden) {
      window.location.href = webUrl;
    }
  }, FALLBACK_DELAY);

  window.addEventListener(
    "pagehide",
    () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
    },
    { once: true }
  );

  window.location.href = deepLink;
};

/** Opens the official SmartPay WhatsApp channel directly in the native app. */
export const openWhatsAppChannel = () => {
  openWithFallback(
    `whatsapp://channel/${WHATSAPP_CHANNEL_ID}`,
    WHATSAPP_CHANNEL_URL
  );
};

/** Opens a WhatsApp group invite directly in the native app. code = chat.whatsapp.com/<code> */
export const openWhatsAppGroup = (code: string) => {
  openWithFallback(
    `whatsapp://chat?code=${code}`,
    `https://chat.whatsapp.com/${code}`
  );
};

export const openSupportWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  openWithFallback(
    `whatsapp://send?phone=${cleaned}`,
    `https://wa.me/${cleaned}`
  );
};
