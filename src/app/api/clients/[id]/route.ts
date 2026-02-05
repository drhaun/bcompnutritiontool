/**
 * API Routes for Individual Client Operations
 * Handles GET, PATCH, DELETE for a specific client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper to create Supabase client for API routes
async function createSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// Helper to check if user can access all clients
async function canUserAccessAllClients(supabase: any, userId: string): Promise<boolean> {
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('role, can_view_all_clients')
    .eq('auth_user_id', userId)
    .single();
  
  return staffRecord?.role === 'admin' || staffRecord?.can_view_all_clients === true;
}

// GET - Fetch a single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has full visibility
    const canViewAll = await canUserAccessAllClients(supabase, user.id);
    
    // Build query - admins/coaches with visibility can access any client
    let query = supabase
      .from('clients')
      .select('*')
      .eq('id', id);
    
    // Only restrict to own clients if user doesn't have full visibility
    if (!canViewAll) {
      query = query.eq('coach_id', user.id);
    }
    
    const { data: client, error } = await query.single();
    
    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has full visibility
    const canViewAll = await canUserAccessAllClients(supabase, user.id);
    
    const body = await request.json();
    
    // Map frontend fields to database fields
    const updateData: Record<string, any> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.userProfile !== undefined) updateData.user_profile = body.userProfile;
    if (body.bodyCompGoals !== undefined) updateData.body_comp_goals = body.bodyCompGoals;
    if (body.dietPreferences !== undefined) updateData.diet_preferences = body.dietPreferences;
    if (body.weeklySchedule !== undefined) updateData.weekly_schedule = body.weeklySchedule;
    if (body.nutritionTargets !== undefined) updateData.nutrition_targets = body.nutritionTargets;
    if (body.mealPlan !== undefined) updateData.meal_plan = body.mealPlan;
    if (body.planHistory !== undefined) updateData.plan_history = body.planHistory;
    if (body.currentStep !== undefined) updateData.current_step = body.currentStep;
    if (body.cronometerClientId !== undefined) updateData.cronometer_client_id = body.cronometerClientId;
    if (body.cronometerClientName !== undefined) updateData.cronometer_client_name = body.cronometerClientName;
    // Phase-based planning fields
    if (body.phases !== undefined) updateData.phases = body.phases;
    if (body.activePhaseId !== undefined) updateData.active_phase_id = body.activePhaseId;
    if (body.timelineEvents !== undefined) updateData.timeline_events = body.timelineEvents;
    
    // Build query - admins/coaches with visibility can update any client
    let query = supabase
      .from('clients')
      .update(updateData)
      .eq('id', id);
    
    // Only restrict to own clients if user doesn't have full visibility
    if (!canViewAll) {
      query = query.eq('coach_id', user.id);
    }
    
    const { data: client, error } = await query.select().single();
    
    if (error) {
      // PGRST116 = no rows returned (client not found or not authorized)
      if (error.code === 'PGRST116') {
        console.log('Client update: No rows returned for id:', id, 'canViewAll:', canViewAll);
        return NextResponse.json({ error: 'Client not found or not authorized' }, { status: 404 });
      }
      console.error('Error updating client:', error);
      return NextResponse.json({ error: 'Failed to update client', details: error.message }, { status: 500 });
    }
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a client (only admins can delete other people's clients)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check staff role - only admins can delete other people's clients
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    
    const isAdmin = staffRecord?.role === 'admin';
    
    // Build query - admins can delete any client, others can only delete their own
    let query = supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (!isAdmin) {
      query = query.eq('coach_id', user.id);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
