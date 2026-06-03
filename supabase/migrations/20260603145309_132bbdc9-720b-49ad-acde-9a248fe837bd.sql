ALTER TABLE public.promo_purchases
ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_promo_purchases_user_verified_at
ON public.promo_purchases (user_id, verified_at DESC)
WHERE status = 'verified';