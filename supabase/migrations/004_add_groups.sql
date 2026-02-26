-- Client Groups: stores group definitions with form configs and optional Stripe settings
CREATE TABLE IF NOT EXISTS public.client_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  form_config jsonb NOT NULL DEFAULT '[]',
  welcome_title text,
  welcome_description text,
  branding jsonb DEFAULT '{}',
  stripe_enabled boolean DEFAULT false,
  stripe_price_id text,
  stripe_promo_enabled boolean DEFAULT false,
  payment_description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Many-to-many join: tag clients into groups
CREATE TABLE IF NOT EXISTS public.client_group_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.client_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_client_group_tags_client ON public.client_group_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_client_group_tags_group ON public.client_group_tags(group_id);
CREATE INDEX IF NOT EXISTS idx_client_groups_slug ON public.client_groups(slug);

-- Add Stripe payment tracking to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS stripe_payment_id text;

-- Seed: Nutrition Intake (full form, all 10 blocks)
INSERT INTO public.client_groups (name, slug, description, form_config, welcome_title, welcome_description)
VALUES (
  'Nutrition Intake',
  'nutrition-intake',
  'Full nutrition intake form for coaching clients',
  '[
    {"id":"personal_info","required":true},
    {"id":"body_composition","required":false},
    {"id":"lifestyle","required":true},
    {"id":"training","required":true},
    {"id":"meals","required":true},
    {"id":"supplements","required":false},
    {"id":"diet_preferences","required":false},
    {"id":"cuisine_foods","required":false},
    {"id":"practical_flavor","required":false},
    {"id":"goals_notes","required":false}
  ]'::jsonb,
  'Nutrition Intake Form',
  'Help us build your personalized nutrition plan by completing this quick form.'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: Team Standard (body comp + goals + activity form with Stripe)
INSERT INTO public.client_groups (name, slug, description, form_config, welcome_title, welcome_description, stripe_enabled, stripe_promo_enabled)
VALUES (
  'Team Standard',
  'team-standard',
  'Team intake form with body composition, goals, RMR, and weekly activity',
  '[
    {"id":"team_personal","required":true},
    {"id":"team_units","required":true},
    {"id":"team_body_comp","required":true},
    {"id":"team_goals","required":true},
    {"id":"team_rmr","required":false},
    {"id":"team_activity","required":true}
  ]'::jsonb,
  'Fitomics Team Intake',
  'Welcome! Complete this form to get started with your personalized nutrition targets.',
  true,
  true
)
ON CONFLICT (slug) DO NOTHING;
