
-- Singleton table for payment account details shown on Buy Promo page
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number text NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  amount text NOT NULL DEFAULT '7200',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read current details (needed for Buy Promo)
CREATE POLICY "Authenticated can read payment settings"
ON public.payment_settings FOR SELECT
TO authenticated
USING (true);

-- No client INSERT/UPDATE/DELETE policies — only edge function (service role) can write.

CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial row
INSERT INTO public.payment_settings (account_number, account_name, bank_name, amount)
VALUES ('5227367627', 'Oluebube Jude Olimba', 'Moniepoint MFB', '7200')
ON CONFLICT (singleton) DO NOTHING;

-- Enable realtime
ALTER TABLE public.payment_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_settings;
