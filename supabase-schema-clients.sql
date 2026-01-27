-- ============================================================
-- FITOMICS NUTRITION PLANNING OS - CLIENTS TABLE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    
    -- Profile data (stored as JSONB for flexibility)
    user_profile JSONB DEFAULT '{}'::jsonb,
    body_comp_goals JSONB DEFAULT '{}'::jsonb,
    diet_preferences JSONB DEFAULT '{}'::jsonb,
    weekly_schedule JSONB DEFAULT '{}'::jsonb,
    nutrition_targets JSONB DEFAULT '[]'::jsonb,
    
    -- Current meal plan (stored as JSONB)
    meal_plan JSONB DEFAULT NULL,
    plan_history JSONB DEFAULT '[]'::jsonb,
    
    -- Workflow state
    current_step INTEGER DEFAULT 1,
    
    -- Cronometer integration
    cronometer_client_id INTEGER,
    cronometer_client_name TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_coach_id ON public.clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON public.clients(updated_at DESC);

-- 3. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies

-- Policy: Users can view their own clients
CREATE POLICY "Users can view own clients"
    ON public.clients
    FOR SELECT
    USING (auth.uid() = coach_id);

-- Policy: Users can insert clients (automatically sets coach_id)
CREATE POLICY "Users can insert own clients"
    ON public.clients
    FOR INSERT
    WITH CHECK (auth.uid() = coach_id OR coach_id IS NULL);

-- Policy: Users can update their own clients
CREATE POLICY "Users can update own clients"
    ON public.clients
    FOR UPDATE
    USING (auth.uid() = coach_id);

-- Policy: Users can delete their own clients
CREATE POLICY "Users can delete own clients"
    ON public.clients
    FOR DELETE
    USING (auth.uid() = coach_id);

-- 7. Grant permissions to authenticated users
GRANT ALL ON public.clients TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================
-- SESSION NOTES TABLE (Optional - for floating notes panel)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for session_notes
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own notes
CREATE POLICY "Users can manage own notes"
    ON public.session_notes
    FOR ALL
    USING (auth.uid() = staff_id);

-- Grant permissions
GRANT ALL ON public.session_notes TO authenticated;

-- Auto-update trigger for session_notes
DROP TRIGGER IF EXISTS update_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON public.session_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- VERIFY SETUP
-- ============================================================

-- This should return the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;
