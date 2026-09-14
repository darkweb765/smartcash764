/**
 * Shared credential normalisation so the same account works on every device.
 * Phone keyboards add capitals, spaces and country-code variations — we strip
 * all of that before the credentials ever reach the authentication service.
 */

export type CredentialKind = "email" | "phone" | "unknown";

export const normalizeEmail = (value: string) =>
  value.replace(/\s+/g, "").toLowerCase();

/** Digits only, Nigerian numbers normalised to +234XXXXXXXXXX. */
export const normalizePhone = (value: string) => {
  let digits = value.replace(/[^\d+]/g, "");
  digits = digits.replace(/(?!^)\+/g, "");

  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 10) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  return digits ? `+${digits}` : "";
};

export const detectCredentialKind = (value: string): CredentialKind => {
  const trimmed = value.trim();
  if (!trimmed) return "unknown";
  if (trimmed.includes("@")) return "email";
  if (/^[+\d][\d\s()-]{5,}$/.test(trimmed)) return "phone";
  return "unknown";
};

export interface NormalizedCredential {
  kind: CredentialKind;
  /** The value to send to the authentication service. */
  value: string;
  /** True when normalisation changed what the user typed. */
  changed: boolean;
}

export const normalizeCredential = (raw: string): NormalizedCredential => {
  const kind = detectCredentialKind(raw);
  const value =
    kind === "phone" ? normalizePhone(raw) : normalizeEmail(raw);
  return { kind, value, changed: value !== raw };
};
