-- Form field linking: allows a coach's source-form submission to auto-populate
-- (and optionally lock) fields on a player's target form within a group.

CREATE TABLE IF NOT EXISTS public.group_form_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.client_groups(id) ON DELETE CASCADE,
  source_form_id uuid NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  target_form_id uuid NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  field_mappings jsonb NOT NULL DEFAULT '[]',
  source_data jsonb,          -- coach's filled-out source form data
  source_filled_at timestamptz,
  source_filled_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, source_form_id, target_form_id)
);

CREATE INDEX idx_group_form_links_group ON public.group_form_links(group_id);
CREATE INDEX idx_group_form_links_target ON public.group_form_links(target_form_id);
