-- Migration: Add Cronometer token persistence columns to staff table
-- 
-- Purpose: Enable cross-device Cronometer authentication persistence.
-- Previously, Cronometer OAuth tokens were stored only in browser cookies,
-- meaning each device/browser required its own OAuth authorization flow.
-- This migration adds columns to store the token in the database, associated
-- with the authenticated staff user, so all devices share the same token.
--
-- Run this migration on your existing Supabase database:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste and run this SQL
--
-- These are safe to run multiple times (IF NOT EXISTS / idempotent).

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cronometer_access_token text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cronometer_user_id text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cronometer_connected_at timestamp with time zone;

-- Optional: If you want to see which staff members are connected to Cronometer
-- SELECT id, email, name, cronometer_user_id, cronometer_connected_at 
-- FROM public.staff 
-- WHERE cronometer_access_token IS NOT NULL;
