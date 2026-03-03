-- Store admin's Kroger OAuth tokens in the staff table (master account model)
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS kroger_access_token text,
  ADD COLUMN IF NOT EXISTS kroger_refresh_token text,
  ADD COLUMN IF NOT EXISTS kroger_token_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS kroger_connected_at timestamp with time zone;

-- Grocery orders placed by staff on behalf of clients
CREATE TABLE IF NOT EXISTS public.grocery_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,

  -- What was ordered
  grocery_items jsonb NOT NULL DEFAULT '[]',
  kroger_matched_items jsonb NOT NULL DEFAULT '[]',
  item_count int NOT NULL DEFAULT 0,

  -- Cost & billing
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  markup_type text NOT NULL DEFAULT 'percentage' CHECK (markup_type IN ('percentage', 'flat')),
  markup_value numeric(10,2) NOT NULL DEFAULT 0,
  total_charged numeric(10,2),
  stripe_payment_link_id text,
  stripe_payment_link_url text,
  stripe_payment_status text DEFAULT 'pending' CHECK (stripe_payment_status IN ('pending', 'sent', 'paid', 'cancelled')),

  -- Delivery
  delivery_address jsonb,

  -- Status tracking
  status text NOT NULL DEFAULT 'matched' CHECK (status IN (
    'matched',         -- Products matched, ready to add to cart
    'in_cart',         -- Added to admin's Kroger cart
    'placed',          -- Admin checked out on Kroger
    'cost_confirmed',  -- Admin entered actual cost
    'invoiced',        -- Invoice sent to client
    'paid',            -- Client paid
    'cancelled'
  )),
  notes text,

  placed_at timestamp with time zone,
  cost_confirmed_at timestamp with time zone,
  invoiced_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grocery_orders_client ON public.grocery_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_grocery_orders_staff ON public.grocery_orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_grocery_orders_status ON public.grocery_orders(status);

-- RLS
ALTER TABLE public.grocery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own orders" ON public.grocery_orders
  FOR SELECT USING (staff_id IN (SELECT id FROM public.staff WHERE auth_user_id = auth.uid()));

CREATE POLICY "Staff can insert orders" ON public.grocery_orders
  FOR INSERT WITH CHECK (staff_id IN (SELECT id FROM public.staff WHERE auth_user_id = auth.uid()));

CREATE POLICY "Staff can update own orders" ON public.grocery_orders
  FOR UPDATE USING (staff_id IN (SELECT id FROM public.staff WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can manage all orders" ON public.grocery_orders
  FOR ALL USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_grocery_orders
BEFORE UPDATE ON public.grocery_orders
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Grocery order settings (markup defaults per staff)
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS grocery_markup_type text DEFAULT 'percentage' CHECK (grocery_markup_type IN ('percentage', 'flat')),
  ADD COLUMN IF NOT EXISTS grocery_markup_value numeric(10,2) DEFAULT 15.00;
