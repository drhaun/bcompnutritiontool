-- Per-form setting to control when (or if) a client profile is created.
-- 'on_start'  = current default: client created when name/email entered
-- 'on_submit' = client created only on final form submission
-- 'none'      = no client created (e.g. coach-only forms)

ALTER TABLE public.intake_forms
  ADD COLUMN IF NOT EXISTS client_creation_mode text NOT NULL DEFAULT 'on_start';

ALTER TABLE public.intake_forms
  ADD CONSTRAINT chk_client_creation_mode
  CHECK (client_creation_mode IN ('on_start', 'on_submit', 'none'));

-- Allow form_submissions without a client (for 'none' mode)
ALTER TABLE public.form_submissions
  ALTER COLUMN client_id DROP NOT NULL;
