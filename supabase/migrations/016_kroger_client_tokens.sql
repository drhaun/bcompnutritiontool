-- Store per-client Kroger OAuth tokens so clients can connect their own accounts
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS kroger_access_token text,
  ADD COLUMN IF NOT EXISTS kroger_refresh_token text,
  ADD COLUMN IF NOT EXISTS kroger_token_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS kroger_connected_at timestamp with time zone;
