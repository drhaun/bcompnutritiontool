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
