-- Add intake form columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS intake_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS intake_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS intake_status text DEFAULT 'pending'
    CHECK (intake_status IN ('pending', 'in_progress', 'completed'));

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_clients_intake_token ON public.clients (intake_token)
  WHERE intake_token IS NOT NULL;

-- Allow self-signup rows (coach_id NULL) by making coach_id nullable
-- Self-signup clients will have coach_id = NULL until claimed by a coach
ALTER TABLE public.clients ALTER COLUMN coach_id DROP NOT NULL;
