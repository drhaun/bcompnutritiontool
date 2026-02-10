-- Add favorite_recipes and resources JSONB columns to clients table
-- These store per-client data as JSONB arrays (same pattern as phases, timeline_events)

ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS favorite_recipes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for client resources (files, guides, etc.)
-- Note: Run this in the Supabase Dashboard SQL Editor or via the Storage API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('client-resources', 'client-resources', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-resources bucket
-- Allow authenticated users to upload files
-- CREATE POLICY "Authenticated users can upload resources"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'client-resources' AND auth.role() = 'authenticated');

-- Allow authenticated users to read files
-- CREATE POLICY "Authenticated users can read resources"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'client-resources' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own files
-- CREATE POLICY "Authenticated users can delete resources"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'client-resources' AND auth.role() = 'authenticated');
