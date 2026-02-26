-- Standalone intake forms table — forms are now first-class entities
CREATE TABLE IF NOT EXISTS public.intake_forms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  form_config jsonb NOT NULL DEFAULT '[]',
  welcome_title text,
  welcome_description text,
  stripe_enabled boolean DEFAULT false,
  stripe_price_id text,
  stripe_promo_enabled boolean DEFAULT false,
  stripe_promo_code text,
  stripe_promo_code_id text,
  payment_description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_forms_slug ON public.intake_forms(slug);
CREATE INDEX IF NOT EXISTS idx_intake_forms_active ON public.intake_forms(is_active) WHERE is_active = true;

-- Link groups to their default form
ALTER TABLE public.client_groups
  ADD COLUMN IF NOT EXISTS default_form_id uuid REFERENCES public.intake_forms(id) ON DELETE SET NULL;

-- Link submissions to the form used
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS form_id uuid REFERENCES public.intake_forms(id) ON DELETE SET NULL;

-- Migrate existing group form configs into intake_forms
-- For each group that has a non-empty form_config, create a corresponding intake_form
-- and set the group's default_form_id to point to it.
DO $$
DECLARE
  grp RECORD;
  new_form_id uuid;
BEGIN
  FOR grp IN
    SELECT id, name, slug, description, form_config,
           welcome_title, welcome_description,
           stripe_enabled, stripe_price_id,
           stripe_promo_enabled, stripe_promo_code, stripe_promo_code_id,
           payment_description
    FROM public.client_groups
    WHERE form_config IS NOT NULL AND form_config != '[]'::jsonb
  LOOP
    -- Only insert if a form with this slug doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM public.intake_forms WHERE slug = grp.slug) THEN
      INSERT INTO public.intake_forms (
        name, slug, description, form_config,
        welcome_title, welcome_description,
        stripe_enabled, stripe_price_id,
        stripe_promo_enabled, stripe_promo_code, stripe_promo_code_id,
        payment_description, is_active
      ) VALUES (
        grp.name || ' Form',
        grp.slug,
        grp.description,
        grp.form_config,
        grp.welcome_title,
        grp.welcome_description,
        COALESCE(grp.stripe_enabled, false),
        grp.stripe_price_id,
        COALESCE(grp.stripe_promo_enabled, false),
        grp.stripe_promo_code,
        grp.stripe_promo_code_id,
        grp.payment_description,
        true
      ) RETURNING id INTO new_form_id;

      UPDATE public.client_groups SET default_form_id = new_form_id WHERE id = grp.id;
    END IF;
  END LOOP;
END$$;
