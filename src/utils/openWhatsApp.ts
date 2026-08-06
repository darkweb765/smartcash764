export const WHATSAPP_CHANNEL_ID = "0029VbAxtp984OmCYlddio40";

export const WHATSAPP_CHANNEL_URL = `https://whatsapp.com/channel/${WHATSAPP_CHANNEL_ID}`;

const FALLBACK_DELAY = 1200;

const ua = () => (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");

export const isIOS = () =>
  /iPhone|iPad|iPod/i.test(ua()) ||
  // iPadOS 13+ reports as Mac with touch
  (/Macintosh/i.test(ua()) && typeof document !== "undefined" && "ontouchend" in document);

export const isAndroid = () => /Android/i.test(ua());

/**
 * Try to launch the native app, and only fall back to the https link if the
 * app clearly never opened (page stayed visible & focused).
 */
const openWithFallback = (deepLink: string, webUrl: string, androidIntent?: string) => {
  if (typeof window === "undefined") return;

  // Desktop / unknown: web link is the only sensible target.
  if (!isIOS() && !isAndroid()) {
    window.open(webUrl, "_blank", "noopener,noreferrer");
    return;
  }

  let appOpened = false;
  const start = Date.now();

  const markOpened = () => {
    appOpened = true;
  };
  const onVisibility = () => {
    if (document.hidden) markOpened();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", markOpened);
  window.addEventListener("pagehide", markOpened);

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", markOpened);
    window.removeEventListener("pagehide", markOpened);
  };

  const timer = window.setTimeout(() => {
    cleanup();
    const elapsed = Date.now() - start;
    // If the JS timer was heavily delayed, the tab was most likely suspended
    // because the native app took over — don't bounce the user to the web.
    const suspended = elapsed > FALLBACK_DELAY + 400;
    if (appOpened || suspended || document.hidden || !document.hasFocus()) return;
    window.location.href = webUrl;
  }, FALLBACK_DELAY);

  window.addEventListener("pagehide", () => window.clearTimeout(timer), { once: true });

  if (isAndroid() && androidIntent) {
    // Android intent:// resolves to the Play Store automatically when the app is missing.
    window.location.href = androidIntent;
  } else {
    // iOS: assigning location is the most reliable way to leave a webview.
    window.location.href = deepLink;
  }
};

/** Opens the official SmartPay WhatsApp channel directly in the native app. */
export const openWhatsAppChannel = () => {
  openWithFallback(
    `whatsapp://channel/${WHATSAPP_CHANNEL_ID}`,
    WHATSAPP_CHANNEL_URL,
    `intent://channel/${WHATSAPP_CHANNEL_ID}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(
      WHATSAPP_CHANNEL_URL
    )};end`
  );
};

/** Opens a WhatsApp group invite directly in the native app. code = chat.whatsapp.com/<code> */
export const openWhatsAppGroup = (code: string) => {
  const web = `https://chat.whatsapp.com/${code}`;
  openWithFallback(
    `whatsapp://chat?code=${code}`,
    web,
    `intent://chat?code=${code}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(
      web
    )};end`
  );
};

export const openSupportWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  const web = `https://wa.me/${cleaned}`;
  openWithFallback(
    `whatsapp://send?phone=${cleaned}`,
    web,
    `intent://send?phone=${cleaned}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(
      web
    )};end`
  );
};
