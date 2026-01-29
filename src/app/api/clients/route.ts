/**
 * API Routes for Client Management
 * Handles CRUD operations for client profiles with Supabase
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

// GET - Fetch all clients for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch clients for this user
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ clients: clients || [] });
  } catch (error) {
    console.error('Clients GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new client
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Create client with coach_id set to current user
    const clientData = {
      coach_id: user.id,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
      status: body.status || 'active',
      user_profile: body.userProfile || {},
      body_comp_goals: body.bodyCompGoals || {},
      diet_preferences: body.dietPreferences || {},
      weekly_schedule: body.weeklySchedule || {},
      nutrition_targets: body.nutritionTargets || [],
      meal_plan: body.mealPlan || null,
      plan_history: body.planHistory || [],
      current_step: body.currentStep || 1,
      cronometer_client_id: body.cronometerClientId || null,
      cronometer_client_name: body.cronometerClientName || null,
      // Phase-based planning fields
      phases: body.phases || [],
      active_phase_id: body.activePhaseId || null,
      timeline_events: body.timelineEvents || [],
    };
    
    const { data: client, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ client });
  } catch (error) {
    console.error('Clients POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Bulk sync clients (for initial sync from localStorage)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { clients: localClients } = await request.json();
    
    if (!Array.isArray(localClients)) {
      return NextResponse.json(
        { error: 'Invalid clients data' },
        { status: 400 }
      );
    }
    
    // Get existing clients from database
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, updated_at')
      .eq('coach_id', user.id);
    
    const existingMap = new Map(
      (existingClients || []).map(c => [c.id, new Date(c.updated_at)])
    );
    
    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    
    for (const client of localClients) {
      const clientData = {
        id: client.id,
        coach_id: user.id,
        name: client.name,
        email: client.email || null,
        phone: client.phone || null,
        notes: client.notes || null,
        status: client.status || 'active',
        user_profile: client.userProfile || {},
        body_comp_goals: client.bodyCompGoals || {},
        diet_preferences: client.dietPreferences || {},
        weekly_schedule: client.weeklySchedule || {},
        nutrition_targets: client.nutritionTargets || [],
        meal_plan: client.mealPlan || null,
        plan_history: client.planHistory || [],
        current_step: client.currentStep || 1,
        cronometer_client_id: client.cronometerClientId || null,
        cronometer_client_name: client.cronometerClientName || null,
        // Phase-based planning fields
        phases: client.phases || [],
        active_phase_id: client.activePhaseId || null,
        timeline_events: client.timelineEvents || [],
      };
      
      const existingDate = existingMap.get(client.id);
      const localDate = new Date(client.updatedAt);
      
      if (!existingDate) {
        // New client - insert
        toInsert.push(clientData);
      } else if (localDate > existingDate) {
        // Local is newer - update
        toUpdate.push(clientData);
      }
      // If database is newer, we'll fetch it in the response
    }
    
    // Perform inserts
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('clients')
        .insert(toInsert);
      
      if (insertError) {
        console.error('Error inserting clients:', insertError);
      }
    }
    
    // Perform updates
    for (const client of toUpdate) {
      const { id, ...updateData } = client;
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);
      
      if (updateError) {
        console.error('Error updating client:', updateError);
      }
    }
    
    // Fetch the latest state from database
    const { data: syncedClients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching synced clients:', error);
      return NextResponse.json(
        { error: 'Sync partially failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      clients: syncedClients || [],
      inserted: toInsert.length,
      updated: toUpdate.length,
    });
  } catch (error) {
    console.error('Clients PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
