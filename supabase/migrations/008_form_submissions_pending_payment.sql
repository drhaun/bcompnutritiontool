-- Widen the form_submissions.status CHECK constraint to include 'pending_payment'.
-- The original constraint (migration 005) only allowed: submitted, reviewed, archived.
-- Stripe-enabled forms set status = 'pending_payment' before checkout completes.

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the CHECK constraint on form_submissions.status
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'form_submissions'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.form_submissions DROP CONSTRAINT %I', constraint_name);
  END IF;
END$$;

ALTER TABLE public.form_submissions
  ADD CONSTRAINT form_submissions_status_check
  CHECK (status IN ('submitted', 'reviewed', 'archived', 'pending_payment'));
