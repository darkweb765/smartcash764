import { supabase } from "@/integrations/supabase/client";

/**
 * Makes sure the signed-in user has their profile + app state rows.
 * Never creates a second account: it is keyed on the auth user id and
 * only inserts when the row is genuinely missing.
 */
export const ensureUserRecords = async (fallbackUsername?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    const username =
      (user.user_metadata?.username as string | undefined) ||
      fallbackUsername ||
      user.email?.split("@")[0] ||
      "User";
    await supabase.from("profiles").insert({ user_id: user.id, username });
  }

  const { data: state } = await supabase
    .from("user_app_state")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!state) {
    await supabase
      .from("user_app_state")
      .insert({ user_id: user.id, balance: 0, gift_claimed: false });
  }
};

/** Normalises what a user types so phone keyboards don't break sign-in. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
