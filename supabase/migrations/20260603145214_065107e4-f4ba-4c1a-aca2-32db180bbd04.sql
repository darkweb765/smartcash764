REVOKE ALL ON FUNCTION public.emit_admin_realtime_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.emit_admin_realtime_event() FROM anon;
REVOKE ALL ON FUNCTION public.emit_admin_realtime_event() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.emit_admin_realtime_event() TO service_role;