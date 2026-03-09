-- Reusable custom field library plus per-form field assignments.

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id text PRIMARY KEY,
  name text NOT NULL,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'textarea', 'number', 'select', 'multiselect', 'toggle', 'date')),
  required_default boolean NOT NULL DEFAULT false,
  placeholder text,
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_fields_name_unique
  ON public.custom_fields(name);

CREATE INDEX IF NOT EXISTS idx_custom_fields_active
  ON public.custom_fields(is_active);

CREATE TABLE IF NOT EXISTS public.form_field_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  block_id text NOT NULL,
  block_instance_id text NOT NULL,
  field_id text NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  required_override boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_form_field_assignments_unique
  ON public.form_field_assignments(form_id, block_instance_id, field_id);

CREATE INDEX IF NOT EXISTS idx_form_field_assignments_form
  ON public.form_field_assignments(form_id, block_instance_id, sort_order);
