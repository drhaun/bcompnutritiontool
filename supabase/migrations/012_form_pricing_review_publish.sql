-- Per-form pricing rules plus reviewed/published submission workflow.

ALTER TABLE public.intake_forms
  ADD COLUMN IF NOT EXISTS pricing_config jsonb;

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS reviewed_form_data jsonb,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by text,
  ADD COLUMN IF NOT EXISTS published_link_id uuid REFERENCES public.group_form_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.form_submissions
  DROP CONSTRAINT IF EXISTS form_submissions_review_status_check;

ALTER TABLE public.form_submissions
  ADD CONSTRAINT form_submissions_review_status_check
  CHECK (review_status IN ('pending', 'reviewed', 'published'));

CREATE INDEX IF NOT EXISTS idx_form_submissions_review_status
  ON public.form_submissions(review_status);

CREATE INDEX IF NOT EXISTS idx_form_submissions_published_link
  ON public.form_submissions(published_link_id);
