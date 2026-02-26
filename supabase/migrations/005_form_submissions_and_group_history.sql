-- Immutable record of every form submission a client makes
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.client_groups(id) ON DELETE SET NULL,
  group_name text,
  group_slug text,
  form_config jsonb NOT NULL DEFAULT '[]',
  form_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  notes text,
  stripe_payment_id text
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_client ON public.form_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_group ON public.form_submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted ON public.form_submissions(submitted_at DESC);

-- Add membership history tracking to client_group_tags
ALTER TABLE public.client_group_tags ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();
ALTER TABLE public.client_group_tags ADD COLUMN IF NOT EXISTS left_at timestamptz;
ALTER TABLE public.client_group_tags ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Drop the unique constraint so we can keep historical rows (re-joins)
-- and add a partial unique for active memberships only
DO $$
BEGIN
  -- Remove old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_group_tags_client_id_group_id_key'
    AND conrelid = 'public.client_group_tags'::regclass
  ) THEN
    ALTER TABLE public.client_group_tags DROP CONSTRAINT client_group_tags_client_id_group_id_key;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_group_tags_active_unique
  ON public.client_group_tags(client_id, group_id) WHERE is_active = true;
