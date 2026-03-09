ALTER TABLE public.custom_fields
  ADD COLUMN IF NOT EXISTS field_kind text NOT NULL DEFAULT 'custom'
    CHECK (field_kind IN ('built_in', 'custom')),
  ADD COLUMN IF NOT EXISTS built_in_key text,
  ADD COLUMN IF NOT EXISTS supported_block_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_keys jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.form_field_assignments
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS label_override text,
  ADD COLUMN IF NOT EXISTS help_text_override text,
  ADD COLUMN IF NOT EXISTS placeholder_override text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_fields_built_in_key_unique
  ON public.custom_fields(built_in_key)
  WHERE built_in_key IS NOT NULL;
