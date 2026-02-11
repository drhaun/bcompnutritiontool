/**
 * Supabase Client
 * Provides database access for the Nutrition Planning OS
 */

import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Types for our database tables
export interface DbFood {
  id: string;
  usda_fdc_id: number | null;
  name: string;
  description: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  serving_size: number;
  serving_unit: string;
  household_serving: string | null;
  category: 'protein' | 'carbs' | 'fats' | 'vegetables' | 'dairy' | 'fruit' | 'grain' | 'other';
  tags: string[] | null;
  data_source: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbClient {
  id: string;
  coach_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  user_profile: Record<string, unknown>;
  body_comp_goals: Record<string, unknown>;
  diet_preferences: Record<string, unknown>;
  weekly_schedule: Record<string, unknown>;
  nutrition_targets: unknown[];
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface DbMealPlan {
  id: string;
  client_id: string;
  name: string | null;
  week_start_date: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  plan_data: Record<string, unknown>;
  total_calories: number | null;
  avg_protein: number | null;
  avg_carbs: number | null;
  avg_fat: number | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMeal {
  id: string;
  meal_plan_id: string | null;
  client_id: string;
  day_of_week: string;
  slot_index: number;
  meal_type: 'meal' | 'snack';
  time_slot: string | null;
  name: string;
  instructions: string[] | null;
  prep_time: string | null;
  ingredients: unknown[];
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  actual_calories: number | null;
  actual_protein: number | null;
  actual_carbs: number | null;
  actual_fat: number | null;
  workout_relation: 'pre-workout' | 'post-workout' | 'none' | null;
  staff_note: string | null;
  ai_rationale: string | null;
  source: 'ai' | 'manual' | 'swapped' | 'template';
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSessionNote {
  id: string;
  client_id: string | null;
  staff_id: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Database type for type-safe queries
export interface Database {
  public: {
    Tables: {
      foods: {
        Row: DbFood;
        Insert: Omit<DbFood, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbFood, 'id' | 'created_at' | 'updated_at'>>;
      };
      clients: {
        Row: DbClient;
        Insert: Omit<DbClient, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbClient, 'id' | 'created_at' | 'updated_at'>>;
      };
      meal_plans: {
        Row: DbMealPlan;
        Insert: Omit<DbMealPlan, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbMealPlan, 'id' | 'created_at' | 'updated_at'>>;
      };
      meals: {
        Row: DbMeal;
        Insert: Omit<DbMeal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbMeal, 'id' | 'created_at' | 'updated_at'>>;
      };
      session_notes: {
        Row: DbSessionNote;
        Insert: Omit<DbSessionNote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbSessionNote, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Backwards compatibility - isLocalOnly means Supabase is NOT configured
export const isLocalOnly = !isSupabaseConfigured;

// Custom fetch that catches network errors (e.g. "Failed to fetch") so Supabase
// gets a controlled error response instead of an uncaught TypeError
function createResilientFetch(): typeof fetch {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      return await nativeFetch(input, init);
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        console.warn('[Supabase] Network error - check connection or try again later');
        return new Response(
          JSON.stringify({ error: 'Network request failed', message: 'Failed to fetch' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }
  };
}

// Create browser client (uses cookies for session storage - works with SSR)
// Custom fetch prevents uncaught "Failed to fetch" TypeError on network errors
export const supabase = isSupabaseConfigured && typeof window !== 'undefined'
  ? createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      global: { fetch: createResilientFetch() },
    })
  : isSupabaseConfigured
    ? createClient<Database>(supabaseUrl!, supabaseAnonKey!) // Server-side fallback
    : null;

// Server-side client with service role (for API routes)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase service role key not configured');
    return null;
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================
// FOOD DATABASE HELPERS
// ============================================================

/**
 * Search foods in Supabase database
 */
export async function searchFoodsInDb(
  query: string,
  options: {
    category?: string;
    limit?: number;
    verified_only?: boolean;
  } = {}
): Promise<DbFood[]> {
  const client = supabase || createServerClient();
  if (!client) {
    console.warn('Supabase not configured, returning empty results');
    return [];
  }

  let dbQuery = client
    .from('foods')
    .select('*')
    .limit(options.limit || 25);

  // Text search on name and description
  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  // Category filter
  if (options.category) {
    dbQuery = dbQuery.eq('category', options.category);
  }

  // Verified only
  if (options.verified_only) {
    dbQuery = dbQuery.eq('is_verified', true);
  }

  // Order by relevance (verified first, then by name match)
  dbQuery = dbQuery.order('is_verified', { ascending: false });

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error searching foods:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a food by ID
 */
export async function getFoodByIdFromDb(id: string): Promise<DbFood | null> {
  const client = supabase || createServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from('foods')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error getting food:', error);
    return null;
  }

  return data;
}

/**
 * Get a food by USDA FDC ID
 */
export async function getFoodByUsdaId(usdaId: number): Promise<DbFood | null> {
  const client = supabase || createServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from('foods')
    .select('*')
    .eq('usda_fdc_id', usdaId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error getting food by USDA ID:', error);
  }

  return data || null;
}

/**
 * Get all foods in a category
 */
export async function getFoodsByCategory(
  category: DbFood['category'],
  limit = 50
): Promise<DbFood[]> {
  const client = supabase || createServerClient();
  if (!client) return [];

  const { data, error } = await client
    .from('foods')
    .select('*')
    .eq('category', category)
    .order('is_verified', { ascending: false })
    .order('name')
    .limit(limit);

  if (error) {
    console.error('Error getting foods by category:', error);
    return [];
  }

  return data || [];
}

/**
 * Convert DbFood to the FoodItem format used by the app
 */
export function dbFoodToFoodItem(dbFood: DbFood) {
  return {
    fdcId: dbFood.usda_fdc_id || 0,
    description: dbFood.description,
    brandName: dbFood.brand || undefined,
    servingSize: dbFood.serving_size,
    servingSizeUnit: dbFood.serving_unit,
    householdServing: dbFood.household_serving || undefined,
    nutrients: {
      calories: Number(dbFood.calories),
      protein: Number(dbFood.protein),
      carbs: Number(dbFood.carbs),
      fat: Number(dbFood.fat),
      fiber: dbFood.fiber ? Number(dbFood.fiber) : undefined,
      sugar: dbFood.sugar ? Number(dbFood.sugar) : undefined,
      sodium: dbFood.sodium ? Number(dbFood.sodium) : undefined,
    },
    category: dbFood.category as 'protein' | 'carbs' | 'fats' | 'vegetables' | 'dairy' | 'fruit' | 'grain' | 'other',
    dataType: dbFood.data_source === 'usda_foundation' ? 'Foundation' as const : 'SR Legacy' as const,
  };
}

// ============================================================
// CLIENT DATABASE HELPERS  
// ============================================================

/**
 * Get all clients (for a coach)
 */
export async function getClients(coachId?: string): Promise<DbClient[]> {
  const client = createServerClient();
  if (!client) return [];

  let query = client.from('clients').select('*');
  
  if (coachId) {
    query = query.eq('coach_id', coachId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    console.error('Error getting clients:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single client by ID
 */
export async function getClientById(clientId: string): Promise<DbClient | null> {
  const client = createServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) {
    console.error('Error getting client:', error);
    return null;
  }

  return data;
}

/**
 * Create a new client in the database
 */
export async function createDbClient(
  clientData: Database['public']['Tables']['clients']['Insert']
): Promise<DbClient | null> {
  const client = createServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    return null;
  }

  return data;
}

/**
 * Update a client in the database
 */
export async function updateDbClient(
  clientId: string,
  updates: Database['public']['Tables']['clients']['Update']
): Promise<DbClient | null> {
  const client = createServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    return null;
  }

  return data;
}

/**
 * Delete a client from the database
 */
export async function deleteDbClient(clientId: string): Promise<boolean> {
  const client = createServerClient();
  if (!client) return false;

  const { error } = await client
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    console.error('Error deleting client:', error);
    return false;
  }

  return true;
}

// ============================================================
// MEAL PLAN DATABASE HELPERS
// ============================================================

/**
 * Save a meal plan
 */
export async function saveMealPlan(
  mealPlanData: Database['public']['Tables']['meal_plans']['Insert']
): Promise<DbMealPlan | null> {
  const client = createServerClient();
  if (!client) return null;

  const { data, error } = await client
    .from('meal_plans')
    .insert(mealPlanData)
    .select()
    .single();

  if (error) {
    console.error('Error saving meal plan:', error);
    return null;
  }

  return data;
}

/**
 * Get meal plans for a client
 */
export async function getMealPlansForClient(clientId: string): Promise<DbMealPlan[]> {
  const client = createServerClient();
  if (!client) return [];

  const { data, error } = await client
    .from('meal_plans')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting meal plans:', error);
    return [];
  }

  return data || [];
}

// Export a test function to verify connection
export async function testSupabaseConnection(): Promise<boolean> {
  const client = supabase || createServerClient();
  if (!client) {
    console.log('Supabase client not configured');
    return false;
  }

  try {
    const { data, error } = await client.from('foods').select('count').limit(1);
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
}
