-- One-time safe backfill: create missing profile / app-state rows for existing accounts.
CREATE OR REPLACE FUNCTION public.backfill_missing_user_records()
RETURNS TABLE (profiles_created integer, app_states_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_count integer := 0;
  s_count integer := 0;
BEGIN
  WITH inserted AS (
    INSERT INTO public.profiles (user_id, username)
    SELECT u.id,
           COALESCE(
             NULLIF(TRIM(u.raw_user_meta_data ->> 'username'), ''),
             NULLIF(SPLIT_PART(LOWER(TRIM(u.email)), '@', 1), ''),
             'User'
           )
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO p_count FROM inserted;

  WITH inserted AS (
    INSERT INTO public.user_app_state (user_id, balance, gift_claimed)
    SELECT u.id, 0, false
    FROM auth.users u
    LEFT JOIN public.user_app_state s ON s.user_id = u.id
    WHERE s.id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO s_count FROM inserted;

  RETURN QUERY SELECT p_count, s_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_missing_user_records() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_missing_user_records() FROM anon;
REVOKE ALL ON FUNCTION public.backfill_missing_user_records() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_missing_user_records() TO service_role;

-- Run it once now.
SELECT * FROM public.backfill_missing_user_records();