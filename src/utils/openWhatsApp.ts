export const WHATSAPP_CHANNEL_ID = "0029VbAxtp984OmCYlddio40";

export const WHATSAPP_CHANNEL_URL = `https://whatsapp.com/channel/${WHATSAPP_CHANNEL_ID}`;

export const openWhatsAppChannel = () => {
  // The official channel link is an app link: on mobile it opens the WhatsApp
  // app straight on the channel page (with the Follow button).
  window.location.href = WHATSAPP_CHANNEL_URL;
};

export const openSupportWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  const appUrl = `whatsapp://send?phone=${cleaned}`;
  window.location.href = appUrl;
};
