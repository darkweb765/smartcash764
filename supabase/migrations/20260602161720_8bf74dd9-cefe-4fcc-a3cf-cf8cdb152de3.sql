CREATE TABLE IF NOT EXISTS public.user_app_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  gift_claimed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_app_state TO authenticated;
GRANT ALL ON public.user_app_state TO service_role;

ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own app state" ON public.user_app_state;
CREATE POLICY "Users can view their own app state"
ON public.user_app_state
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own app state" ON public.user_app_state;
CREATE POLICY "Users can create their own app state"
ON public.user_app_state
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own app state" ON public.user_app_state;
CREATE POLICY "Users can update their own app state"
ON public.user_app_state
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_app_state_updated_at ON public.user_app_state;
CREATE TRIGGER update_user_app_state_updated_at
BEFORE UPDATE ON public.user_app_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;