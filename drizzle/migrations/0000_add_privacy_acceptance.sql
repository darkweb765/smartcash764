ALTER TABLE public.profiles ADD COLUMN privacy_accepted_at timestamptz;
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'Timestamp when the user accepted the Privacy Policy at registration';
UPDATE public.profiles SET privacy_accepted_at = created_at WHERE privacy_accepted_at IS NULL;