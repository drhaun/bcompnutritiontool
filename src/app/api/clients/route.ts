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
    
    // Check if user is admin or has full visibility
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select('role, can_view_all_clients')
      .eq('auth_user_id', user.id)
      .single();
    
    // Log staff lookup for debugging
    if (staffError) {
      console.warn('[Clients API] Staff lookup error for user', user.id, ':', staffError.message);
    } else {
      console.log('[Clients API] Staff record found:', { 
        role: staffRecord?.role, 
        canViewAll: staffRecord?.can_view_all_clients 
      });
    }
    
    const canViewAll = staffRecord?.role === 'admin' || staffRecord?.can_view_all_clients === true;
    console.log('[Clients API] User visibility - canViewAll:', canViewAll, 'userId:', user.id);
    
    // Fetch clients - admins see all, others see only their own
    let query = supabase
      .from('clients')
      .select('*')
      .order('updated_at', { ascending: false });
    
    // Only filter by coach_id if user doesn't have full visibility
    if (!canViewAll) {
      query = query.eq('coach_id', user.id);
    }
    
    const { data: clients, error } = await query;
    
    if (error) {
      console.error('[Clients API] Error fetching clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('[Clients API] Returning', clients?.length || 0, 'clients');
    return NextResponse.json({ 
      clients: clients || [],
      // Include visibility info for debugging
      _debug: {
        userId: user.id,
        hasStaffRecord: !!staffRecord,
        staffRole: staffRecord?.role,
        canViewAllClients: staffRecord?.can_view_all_clients,
        canViewAll,
      }
    });
  } catch (error) {
    console.error('[Clients API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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
    // Only include ID if it's a valid UUID, otherwise let DB generate one
    const clientData: Record<string, any> = {
      coach_id: user.id,
      name: body.name || 'Unnamed Client',
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
      // Favorites and resources
      favorite_recipes: body.favoriteRecipes || [],
      resources: body.resources || [],
    };
    
    // Only include ID if it's a valid UUID
    if (body.id && isValidUUID(body.id)) {
      // Check if a client with this ID already exists (possibly from another coach)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, coach_id')
        .eq('id', body.id)
        .maybeSingle();
      
      if (existingClient) {
        // Client exists - check ownership
        if (existingClient.coach_id !== user.id) {
          console.log('[Clients API] Client exists but owned by different coach, generating new ID');
          // Don't use the provided ID, let DB generate a new one
        } else {
          // Same owner, we can use the ID
          clientData.id = body.id;
        }
      } else {
        // Client doesn't exist, safe to use the ID
        clientData.id = body.id;
      }
    }
    
    console.log('[Clients API] Creating client with coach_id:', user.id);
    console.log('[Clients API] Client data ID:', clientData.id || 'auto-generated');
    
    // Use upsert to handle the case where client might already exist
    // This will insert if new, or update if exists (with matching coach_id due to RLS)
    const { data: client, error } = await supabase
      .from('clients')
      .upsert(clientData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Clients API] Error creating/upserting client:', error);
      console.error('[Clients API] Error code:', error.code);
      console.error('[Clients API] Error details:', error.details);
      console.error('[Clients API] Error hint:', error.hint);
      
      // If it's a duplicate key or RLS violation, try again without the ID
      if (error.code === '23505' || error.code === '42501' || error.message?.includes('policy') || error.message?.includes('duplicate')) {
        console.log('[Clients API] Retrying without explicit ID (conflict detected)');
        
        // Remove the ID and let the database generate a new one
        delete clientData.id;
        
        const { data: retryClient, error: retryError } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();
        
        if (retryError) {
          console.error('[Clients API] Retry also failed:', retryError);
          return NextResponse.json(
            { 
              error: 'Failed to create client', 
              details: retryError.message,
              code: retryError.code
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ 
          client: retryClient,
          localId: body.id, // Return the original local ID so client can update mapping
          newIdGenerated: true,
        });
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create client', 
          details: error.message,
          code: error.code,
          hint: error.hint 
        },
        { status: 500 }
      );
    }
    
    // Return the client with the local ID mapping if we generated a new UUID
    return NextResponse.json({ 
      client,
      localId: body.id, // Return the original local ID so client can update mapping
    });
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
    
    // Check if user is admin or has full visibility
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('role, can_view_all_clients')
      .eq('auth_user_id', user.id)
      .single();
    
    const canViewAll = staffRecord?.role === 'admin' || staffRecord?.can_view_all_clients === true;
    
    const { clients: localClients } = await request.json();
    
    if (!Array.isArray(localClients)) {
      return NextResponse.json(
        { error: 'Invalid clients data' },
        { status: 400 }
      );
    }
    
    // Get existing clients from database - respecting visibility rules
    let existingQuery = supabase
      .from('clients')
      .select('id, updated_at, coach_id');
    
    if (!canViewAll) {
      existingQuery = existingQuery.eq('coach_id', user.id);
    }
    
    const { data: existingClients } = await existingQuery;
    
    const existingMap = new Map(
      (existingClients || []).map(c => [c.id, { updatedAt: new Date(c.updated_at), coachId: c.coach_id }])
    );
    
    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    
    for (const client of localClients) {
      const existing = existingMap.get(client.id);
      
      // Preserve the original coach_id if updating someone else's client
      // Only set to current user if this is a brand new client
      const coachId = existing?.coachId || client.coachId || user.id;
      
      const clientData = {
        id: client.id,
        coach_id: coachId,
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
        // Favorites and resources
        favorite_recipes: client.favoriteRecipes || [],
        resources: client.resources || [],
      };
      
      const localDate = new Date(client.updatedAt);
      
      if (!existing) {
        // New client - insert
        toInsert.push(clientData);
      } else if (localDate > existing.updatedAt) {
        // Local is newer - update
        toUpdate.push(clientData);
      }
      // If database is newer, we'll fetch it in the response
    }
    
    // Track errors for debugging
    const errors: string[] = [];
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Perform inserts
    if (toInsert.length > 0) {
      console.log('[Clients API] Inserting', toInsert.length, 'clients for coach:', user.id);
      console.log('[Clients API] Clients to insert:', toInsert.map(c => ({ id: c.id, name: c.name, coach_id: c.coach_id })));
      
      const { data: insertedData, error: insertError } = await supabase
        .from('clients')
        .insert(toInsert)
        .select();
      
      if (insertError) {
        console.error('[Clients API] Insert error:', insertError);
        console.error('[Clients API] Insert error code:', insertError.code);
        console.error('[Clients API] Insert error details:', insertError.details);
        console.error('[Clients API] Insert error hint:', insertError.hint);
        errors.push(`Insert failed: ${insertError.message} (code: ${insertError.code})`);
      } else {
        insertedCount = insertedData?.length || 0;
        console.log('[Clients API] Successfully inserted', insertedCount, 'clients');
      }
    }
    
    // Perform updates
    for (const client of toUpdate) {
      const { id, ...updateData } = client;
      console.log('[Clients API] Updating client:', id);
      
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);
      
      if (updateError) {
        console.error('[Clients API] Update error for client', id, ':', updateError);
        errors.push(`Update failed for ${id}: ${updateError.message}`);
      } else {
        updatedCount++;
      }
    }
    
    // Fetch the latest state from database - respecting visibility rules
    let syncQuery = supabase
      .from('clients')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (!canViewAll) {
      syncQuery = syncQuery.eq('coach_id', user.id);
    }
    
    const { data: syncedClients, error } = await syncQuery;
    
    if (error) {
      console.error('[Clients API] Error fetching synced clients:', error);
      return NextResponse.json(
        { error: 'Sync partially failed', details: error.message, insertErrors: errors },
        { status: 500 }
      );
    }
    
    console.log('[Clients API] Sync complete - inserted:', insertedCount, 'updated:', updatedCount, 'total in DB:', syncedClients?.length || 0);
    
    // Return with error info if any errors occurred
    return NextResponse.json({
      clients: syncedClients || [],
      inserted: insertedCount,
      updated: updatedCount,
      attempted: { insert: toInsert.length, update: toUpdate.length },
      errors: errors.length > 0 ? errors : undefined,
      _debug: {
        userId: user.id,
        canViewAll,
        toInsertCount: toInsert.length,
        toUpdateCount: toUpdate.length,
      }
    });
  } catch (error) {
    console.error('Clients PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
