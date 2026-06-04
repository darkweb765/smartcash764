CREATE TABLE public.admin_master_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  used_by_user_id UUID
);
GRANT ALL ON public.admin_master_codes TO service_role;
ALTER TABLE public.admin_master_codes ENABLE ROW LEVEL SECURITY;