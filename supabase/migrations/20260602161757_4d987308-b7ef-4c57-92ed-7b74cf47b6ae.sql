CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), 'User'))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_app_state (user_id, balance, gift_claimed)
  VALUES (NEW.id, 0, false)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.user_app_state (user_id, balance, gift_claimed)
SELECT p.user_id, 0, false
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;