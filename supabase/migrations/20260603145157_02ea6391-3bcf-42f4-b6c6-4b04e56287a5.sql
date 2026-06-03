CREATE TABLE IF NOT EXISTS public.admin_realtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  table_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_realtime_events TO anon;
GRANT SELECT ON public.admin_realtime_events TO authenticated;
GRANT ALL ON public.admin_realtime_events TO service_role;

ALTER TABLE public.admin_realtime_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can receive admin refresh events" ON public.admin_realtime_events;
CREATE POLICY "Anyone can receive admin refresh events"
ON public.admin_realtime_events
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.emit_admin_realtime_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_realtime_events (event_type, table_name)
  VALUES (TG_OP, TG_TABLE_NAME);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS emit_admin_realtime_promo_purchases ON public.promo_purchases;
CREATE TRIGGER emit_admin_realtime_promo_purchases
AFTER INSERT OR UPDATE OR DELETE ON public.promo_purchases
FOR EACH ROW EXECUTE FUNCTION public.emit_admin_realtime_event();

DROP TRIGGER IF EXISTS emit_admin_realtime_promo_codes ON public.promo_codes;
CREATE TRIGGER emit_admin_realtime_promo_codes
AFTER INSERT OR UPDATE OR DELETE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.emit_admin_realtime_event();

DROP TRIGGER IF EXISTS emit_admin_realtime_withdrawals ON public.withdrawal_requests;
CREATE TRIGGER emit_admin_realtime_withdrawals
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.emit_admin_realtime_event();

DROP TRIGGER IF EXISTS emit_admin_realtime_reports ON public.support_tickets;
CREATE TRIGGER emit_admin_realtime_reports
AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.emit_admin_realtime_event();

DROP TRIGGER IF EXISTS emit_admin_realtime_chat ON public.chat_messages;
CREATE TRIGGER emit_admin_realtime_chat
AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.emit_admin_realtime_event();

ALTER TABLE public.admin_realtime_events REPLICA IDENTITY FULL;
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_realtime_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_realtime_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END $$;