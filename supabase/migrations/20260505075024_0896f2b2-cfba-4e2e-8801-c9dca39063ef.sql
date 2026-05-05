-- Ensure promo codes are unique across the whole table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_codes_code_unique'
  ) THEN
    ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_code_unique UNIQUE (code);
  END IF;
END $$;

-- Enable realtime
ALTER TABLE public.promo_codes REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_codes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;