export const WHATSAPP_CHANNEL_ID = "0029VbAxtp984OmCYlddio40";

export const openWhatsAppChannel = () => {
  const appUrl = `whatsapp://channel/?id=${WHATSAPP_CHANNEL_ID}`;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  if (isMobile) {
    // Direct app navigation — no browser/web fallback.
    window.location.href = appUrl;
  } else {
    // On desktop, try the same deep link; most desktop WhatsApp clients handle it.
    window.location.href = appUrl;
  }
};

export const openSupportWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  const appUrl = `whatsapp://send?phone=${cleaned}`;
  window.location.href = appUrl;
};
