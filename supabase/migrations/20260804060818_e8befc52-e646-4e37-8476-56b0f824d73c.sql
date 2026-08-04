ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.scheduled_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  direction text NOT NULL DEFAULT 'credit',
  sender_name text NOT NULL,
  sender_bank text NOT NULL,
  amount numeric NOT NULL,
  deliver_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'scheduled',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.scheduled_transfers TO service_role;
ALTER TABLE public.scheduled_transfers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS scheduled_transfers_due_idx
  ON public.scheduled_transfers (status, deliver_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_app_state;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;