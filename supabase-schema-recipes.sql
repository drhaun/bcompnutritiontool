-- ============================================
-- NUTRITION INSIDERS RECIPES TABLE SCHEMA
-- ============================================
-- This table stores curated recipes from Nutrition Insiders
-- that can be recommended to clients based on their preferences
-- and automatically scaled to meet their macro targets.

-- Create the recipes table
CREATE TABLE IF NOT EXISTS public.ni_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Info
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cronometer_name TEXT,  -- Name in Cronometer for syncing
    
    -- Category & Tags
    category TEXT NOT NULL,  -- breakfast, lunch, dinner, snack, etc.
    tags TEXT[] DEFAULT '{}',  -- Array of hashtags/categories
    
    -- Nutrition Data (per serving)
    serving_size_g NUMERIC,
    calories NUMERIC NOT NULL,
    protein NUMERIC NOT NULL,
    carbs NUMERIC NOT NULL,
    fat NUMERIC NOT NULL,
    fiber NUMERIC DEFAULT 0,
    
    -- Recipe Details
    ingredients JSONB NOT NULL,  -- Array of {item: string, amount: string}
    directions TEXT[] NOT NULL,  -- Array of step strings
    description TEXT,  -- Original HTML description for reference
    
    -- Media
    image_url TEXT,
    
    -- Meal Context Matching
    suitable_for_pre_workout BOOLEAN DEFAULT false,
    suitable_for_post_workout BOOLEAN DEFAULT false,
    is_high_protein BOOLEAN DEFAULT false,  -- >25g protein
    is_low_carb BOOLEAN DEFAULT false,  -- <20g carbs
    is_low_fat BOOLEAN DEFAULT false,  -- <10g fat
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_dairy_free BOOLEAN DEFAULT false,
    is_meal_prep_friendly BOOLEAN DEFAULT false,
    is_quick_prep BOOLEAN DEFAULT false,  -- <15 min
    
    -- Prep Info
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    
    -- Scaling
    min_servings NUMERIC DEFAULT 0.5,  -- Minimum scalable amount
    max_servings NUMERIC DEFAULT 4,    -- Maximum scalable amount
    
    -- Metadata
    source TEXT DEFAULT 'nutrition_insiders',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ni_recipes_category ON public.ni_recipes(category);
CREATE INDEX IF NOT EXISTS idx_ni_recipes_calories ON public.ni_recipes(calories);
CREATE INDEX IF NOT EXISTS idx_ni_recipes_protein ON public.ni_recipes(protein);
CREATE INDEX IF NOT EXISTS idx_ni_recipes_tags ON public.ni_recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ni_recipes_suitable_pre_workout ON public.ni_recipes(suitable_for_pre_workout) WHERE suitable_for_pre_workout = true;
CREATE INDEX IF NOT EXISTS idx_ni_recipes_suitable_post_workout ON public.ni_recipes(suitable_for_post_workout) WHERE suitable_for_post_workout = true;
CREATE INDEX IF NOT EXISTS idx_ni_recipes_high_protein ON public.ni_recipes(is_high_protein) WHERE is_high_protein = true;

-- Enable RLS
ALTER TABLE public.ni_recipes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read recipes (they're shared content)
DROP POLICY IF EXISTS "Anyone can view recipes" ON public.ni_recipes;
CREATE POLICY "Anyone can view recipes" ON public.ni_recipes
    FOR SELECT
    USING (is_active = true);

-- Only service role can insert/update (for seeding)
DROP POLICY IF EXISTS "Service role can manage recipes" ON public.ni_recipes;
CREATE POLICY "Service role can manage recipes" ON public.ni_recipes
    FOR ALL
    USING (auth.role() = 'service_role');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ni_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ni_recipes_timestamp ON public.ni_recipes;
CREATE TRIGGER update_ni_recipes_timestamp
    BEFORE UPDATE ON public.ni_recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_ni_recipes_updated_at();

-- ============================================
-- HELPER VIEW: Recipe Search with computed fields
-- ============================================
CREATE OR REPLACE VIEW public.ni_recipes_search AS
SELECT 
    r.*,
    -- Macro percentages
    ROUND((r.protein * 4 / NULLIF(r.calories, 0)) * 100) as protein_pct,
    ROUND((r.carbs * 4 / NULLIF(r.calories, 0)) * 100) as carbs_pct,
    ROUND((r.fat * 9 / NULLIF(r.calories, 0)) * 100) as fat_pct,
    -- Protein per 100 calories
    ROUND(r.protein / NULLIF(r.calories, 0) * 100, 1) as protein_per_100cal
FROM public.ni_recipes r
WHERE r.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.ni_recipes_search TO authenticated;
GRANT SELECT ON public.ni_recipes_search TO anon;

COMMENT ON TABLE public.ni_recipes IS 'Curated recipes from Nutrition Insiders for meal planning recommendations';
COMMENT ON COLUMN public.ni_recipes.cronometer_name IS 'The exact name used in Cronometer for food logging integration';
COMMENT ON COLUMN public.ni_recipes.ingredients IS 'JSON array of {item: string, amount: string, unit?: string}';
