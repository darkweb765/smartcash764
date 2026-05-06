// Backend-only admin auth helpers. No secrets here.
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/admin-actions`;

const TOKEN_KEY = "admin_jwt";
const EXP_KEY = "admin_jwt_exp";

export const setAdminToken = (token: string, expiresAt: number) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXP_KEY, String(expiresAt));
};
export const clearAdminToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXP_KEY);
};
export const getAdminToken = (): string | null => {
  const t = localStorage.getItem(TOKEN_KEY);
  const exp = Number(localStorage.getItem(EXP_KEY) || 0);
  if (!t) return null;
  if (exp && exp * 1000 < Date.now()) {
    clearAdminToken();
    return null;
  }
  return t;
};

export const adminFetch = async (
  action: string,
  init: { method?: string; body?: any; extra?: string } = {}
) => {
  const token = getAdminToken();
  const url = `${FN_URL}?action=${encodeURIComponent(action)}${init.extra || ""}`;
  const res = await fetch(url, {
    method: init.method || (init.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    return { ok: false, status: res.status, data: null as any };
  }
  let data: any = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
};

export const adminPublicFetch = async (action: string, body?: any, method = "POST") => {
  const res = await fetch(`${FN_URL}?action=${action}`, {
    method,
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
};
