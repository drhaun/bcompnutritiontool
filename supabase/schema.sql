-- Fitomics Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (app-level profile data)
create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique,
  name text,
  gender text,
  age int,
  height_ft int,
  height_in int,
  height_cm numeric,
  weight_lbs numeric,
  weight_kg numeric,
  body_fat_percentage numeric,
  activity_level text,
  workouts_per_week int,
  goal_focus text,
  lifestyle_commitment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Body composition goals
create table if not exists public.body_comp_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  goal_type text,
  target_weight_lbs numeric,
  target_body_fat numeric,
  timeline_weeks int,
  weekly_weight_change_pct numeric,
  performance_preference text,
  body_comp_preference text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Diet preferences
create table if not exists public.diet_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  dietary_restrictions jsonb,
  allergies jsonb,
  preferred_proteins jsonb,
  preferred_carbs jsonb,
  preferred_fats jsonb,
  preferred_vegetables jsonb,
  cuisine_preferences jsonb,
  disliked_foods jsonb,
  spice_level text,
  flavor_profiles jsonb,
  preferred_seasonings jsonb,
  cooking_time_preference text,
  budget_preference text,
  cooking_for text,
  leftovers_preference text,
  variety_level text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Weekly schedule
create table if not exists public.weekly_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  schedule jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Nutrition targets
create table if not exists public.nutrition_targets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  targets jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Meal plans
create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  plan jsonb,
  version int default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Clients table (for coach-managed client profiles)
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null, -- References auth.users
  name text not null,
  email text,
  phone text,
  notes text,
  status text default 'active',
  user_profile jsonb default '{}',
  body_comp_goals jsonb default '{}',
  diet_preferences jsonb default '{}',
  weekly_schedule jsonb default '{}',
  nutrition_targets jsonb default '[]',
  meal_plan jsonb,
  plan_history jsonb default '[]',
  current_step int default 1,
  cronometer_client_id int,
  cronometer_client_name text,
  -- Phase-based planning fields
  phases jsonb default '[]',
  active_phase_id uuid,
  timeline_events jsonb default '[]',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for faster lookups by coach
create index if not exists idx_clients_coach_id on public.clients(coach_id);

-- Trigger for clients updated_at
create trigger set_updated_at_clients
before update on public.clients
for each row execute procedure public.set_updated_at();

-- Row Level Security for clients table
alter table public.clients enable row level security;

-- Policy: Users can only see their own clients
create policy "Users can view own clients" on public.clients
  for select using (auth.uid() = coach_id);

-- Policy: Users can insert their own clients  
create policy "Users can insert own clients" on public.clients
  for insert with check (auth.uid() = coach_id);

-- Policy: Users can update their own clients
create policy "Users can update own clients" on public.clients
  for update using (auth.uid() = coach_id);

-- Policy: Users can delete their own clients
create policy "Users can delete own clients" on public.clients
  for delete using (auth.uid() = coach_id);

-- Migration: Add phase columns to existing clients table (run if table already exists)
-- ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phases jsonb default '[]';
-- ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS active_phase_id uuid;
-- ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS timeline_events jsonb default '[]';

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_user_profiles
before update on public.user_profiles
for each row execute procedure public.set_updated_at();

create trigger set_updated_at_body_comp_goals
before update on public.body_comp_goals
for each row execute procedure public.set_updated_at();

create trigger set_updated_at_diet_preferences
before update on public.diet_preferences
for each row execute procedure public.set_updated_at();

create trigger set_updated_at_weekly_schedules
before update on public.weekly_schedules
for each row execute procedure public.set_updated_at();

create trigger set_updated_at_nutrition_targets
before update on public.nutrition_targets
for each row execute procedure public.set_updated_at();

create trigger set_updated_at_meal_plans
before update on public.meal_plans
for each row execute procedure public.set_updated_at();
