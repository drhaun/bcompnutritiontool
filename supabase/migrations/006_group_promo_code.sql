-- Store the group's assigned Stripe promotion code so the admin UI
-- only shows the code relevant to this specific group/product.
ALTER TABLE public.client_groups ADD COLUMN IF NOT EXISTS stripe_promo_code text;
ALTER TABLE public.client_groups ADD COLUMN IF NOT EXISTS stripe_promo_code_id text;
