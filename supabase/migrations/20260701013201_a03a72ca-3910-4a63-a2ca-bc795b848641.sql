CREATE TRIGGER emit_admin_realtime_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.emit_admin_realtime_event();