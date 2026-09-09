CREATE TABLE public.expired_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.expired_promo_codes TO authenticated;
GRANT ALL ON public.expired_promo_codes TO service_role;

ALTER TABLE public.expired_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can check expired promo codes"
ON public.expired_promo_codes
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_expired_promo_codes_updated_at
BEFORE UPDATE ON public.expired_promo_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.expired_promo_codes;