/**
 * Client Sync Service
 * Handles synchronization between local Zustand store and Supabase database
 */

import type { ClientProfile } from '@/types';

// Convert database format to store format
export function dbClientToStoreClient(dbClient: any): ClientProfile {
  return {
    id: dbClient.id,
    name: dbClient.name,
    email: dbClient.email || undefined,
    phone: dbClient.phone || undefined,
    notes: dbClient.notes || undefined,
    status: dbClient.status || 'active',
    createdAt: dbClient.created_at,
    updatedAt: dbClient.updated_at,
    userProfile: dbClient.user_profile || {},
    bodyCompGoals: dbClient.body_comp_goals || {},
    dietPreferences: dbClient.diet_preferences || {},
    weeklySchedule: dbClient.weekly_schedule || {},
    nutritionTargets: dbClient.nutrition_targets || [],
    mealPlan: dbClient.meal_plan || null,
    planHistory: dbClient.plan_history || [],
    currentStep: dbClient.current_step || 1,
    cronometerClientId: dbClient.cronometer_client_id || undefined,
    cronometerClientName: dbClient.cronometer_client_name || undefined,
    // Phase-based planning fields
    phases: dbClient.phases || [],
    activePhaseId: dbClient.active_phase_id || undefined,
    timelineEvents: dbClient.timeline_events || [],
  };
}

// Convert store format to API format
export function storeClientToApiFormat(client: ClientProfile) {
  return {
    id: client.id,
    name: client.name,
    email: client.email || null,
    phone: client.phone || null,
    notes: client.notes || null,
    status: client.status,
    coachId: client.coachId, // Include coachId if set (API will use current user if undefined)
    userProfile: client.userProfile,
    bodyCompGoals: client.bodyCompGoals,
    dietPreferences: client.dietPreferences,
    weeklySchedule: client.weeklySchedule,
    nutritionTargets: client.nutritionTargets,
    mealPlan: client.mealPlan,
    planHistory: client.planHistory || [],
    currentStep: client.currentStep,
    cronometerClientId: client.cronometerClientId,
    cronometerClientName: client.cronometerClientName,
    updatedAt: client.updatedAt,
    // Phase-based planning fields
    phases: client.phases || [],
    activePhaseId: client.activePhaseId,
    timelineEvents: client.timelineEvents || [],
  };
}

/**
 * Fetch all clients from Supabase
 */
export async function fetchClientsFromDb(): Promise<ClientProfile[]> {
  try {
    console.log('[ClientSync] Fetching clients from database...');
    
    const response = await fetch('/api/clients', {
      credentials: 'include', // Ensure cookies are sent
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ClientSync] Not authenticated (401), using local storage');
        return [];
      }
      const errorText = await response.text();
      console.error('[ClientSync] Fetch failed:', response.status, errorText);
      throw new Error('Failed to fetch clients');
    }
    
    const data = await response.json();
    console.log('[ClientSync] Fetch response:', {
      clientCount: data.clients?.length || 0,
      debug: data._debug,
    });
    
    const clients = (data.clients || []).map(dbClientToStoreClient);
    console.log('[ClientSync] Returning', clients.length, 'clients');
    return clients;
  } catch (error) {
    console.error('[ClientSync] Error fetching clients:', error);
    return [];
  }
}

/**
 * Sync local clients to Supabase (merge strategy)
 */
export async function syncClientsToDb(localClients: ClientProfile[]): Promise<{
  success: boolean;
  clients: ClientProfile[];
  error?: string;
}> {
  try {
    console.log('[ClientSync] Starting sync with', localClients.length, 'local clients');
    
    const response = await fetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure cookies are sent
      body: JSON.stringify({
        clients: localClients.map(storeClientToApiFormat),
      }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ClientSync] Not authenticated yet, keeping local clients');
        return { success: false, clients: localClients, error: 'Not authenticated' };
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('[ClientSync] Sync API error:', errorData);
      throw new Error(errorData.error || 'Failed to sync clients');
    }
    
    const data = await response.json();
    console.log('[ClientSync] Sync response:', {
      inserted: data.inserted,
      updated: data.updated,
      attempted: data.attempted,
      clientsReturned: data.clients?.length || 0,
      errors: data.errors,
      debug: data._debug,
    });
    
    // CRITICAL: If there were errors inserting/updating, DON'T lose local clients!
    if (data.errors && data.errors.length > 0) {
      console.error('[ClientSync] Sync had errors:', data.errors);
      
      // If we tried to insert clients but they failed, keep local clients
      if (data.attempted?.insert > 0 && data.inserted === 0) {
        console.error('[ClientSync] CRITICAL: Insert failed! Keeping local clients to prevent data loss');
        return {
          success: false,
          clients: localClients,
          error: data.errors.join('; '),
        };
      }
    }
    
    // Verify we got clients back - if not, keep local clients
    if (!data.clients || data.clients.length === 0) {
      console.warn('[ClientSync] WARNING: Sync returned 0 clients!');
      if (localClients.length > 0) {
        console.warn('[ClientSync] Had', localClients.length, 'local clients, keeping them');
        return {
          success: false,
          clients: localClients,
          error: data.errors?.join('; ') || 'Sync returned no clients',
        };
      }
    }
    
    // EXTRA SAFETY: If we had local clients but got fewer back, merge them
    const dbClients = (data.clients || []).map(dbClientToStoreClient);
    if (localClients.length > 0 && dbClients.length < localClients.length) {
      console.warn('[ClientSync] Database returned fewer clients than local. Merging to prevent loss.');
      const dbIds = new Set(dbClients.map(c => c.id));
      const missingLocal = localClients.filter(c => !dbIds.has(c.id));
      if (missingLocal.length > 0) {
        console.log('[ClientSync] Preserving', missingLocal.length, 'local clients not in database');
        return {
          success: true,
          clients: [...dbClients, ...missingLocal],
        };
      }
    }
    
    return {
      success: true,
      clients: dbClients,
    };
  } catch (error) {
    console.error('[ClientSync] Error syncing clients:', error);
    return {
      success: false,
      clients: localClients,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new client in Supabase
 * Returns the created client with the database-generated UUID
 */
export async function createClientInDb(client: ClientProfile): Promise<ClientProfile | null> {
  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure auth cookies are sent
      body: JSON.stringify(storeClientToApiFormat(client)),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[ClientSync] Create client failed:', response.status, errorData);
      throw new Error(errorData.error || 'Failed to create client');
    }
    
    const data = await response.json();
    const dbClient = dbClientToStoreClient(data.client);
    
    // If the local ID was different (non-UUID), log the mapping
    if (data.localId && data.localId !== data.client.id) {
      console.log('[ClientSync] Client created with ID mapping:', data.localId, '->', data.client.id);
    } else {
      console.log('[ClientSync] Client created successfully:', data.client?.id);
    }
    
    return dbClient;
  } catch (error) {
    console.error('[ClientSync] Error creating client:', error);
    return null;
  }
}

/**
 * Update a client in Supabase (creates if doesn't exist)
 */
export async function updateClientInDb(
  clientId: string,
  updates: Partial<ClientProfile>
): Promise<ClientProfile | null> {
  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure cookies are sent for auth
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ClientSync] Not authenticated, update skipped');
        return null;
      }
      
      // If client doesn't exist (404), try to create it instead
      if (response.status === 404) {
        console.log('[ClientSync] Client not found in DB, creating new record for:', clientId);
        
        // Build a full client object for creation
        const newClient: ClientProfile = {
          id: clientId,
          name: updates.userProfile?.name || 'Unnamed Client',
          email: updates.email,
          notes: updates.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: updates.status || 'active',
          userProfile: updates.userProfile || {},
          bodyCompGoals: updates.bodyCompGoals || {},
          dietPreferences: updates.dietPreferences || {},
          weeklySchedule: updates.weeklySchedule || {},
          phases: updates.phases || [],
          activePhaseId: updates.activePhaseId,
          timelineEvents: updates.timelineEvents || [],
          nutritionTargets: updates.nutritionTargets || [],
          mealPlan: updates.mealPlan || null,
          currentStep: updates.currentStep || 1,
          planHistory: updates.planHistory || [],
        };
        
        return await createClientInDb(newClient);
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error('[ClientSync] Update failed:', errorData);
      throw new Error(errorData.error || 'Failed to update client');
    }
    
    const data = await response.json();
    return dbClientToStoreClient(data.client);
  } catch (error) {
    console.error('[ClientSync] Error updating client:', error);
    return null;
  }
}

/**
 * Delete a client from Supabase
 */
export async function deleteClientFromDb(clientId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'DELETE',
      credentials: 'include', // Ensure auth cookies are sent
    });
    
    return response.ok;
  } catch (error) {
    console.error('[ClientSync] Error deleting client:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/clients', {
      credentials: 'include', // Ensure auth cookies are sent
    });
    return response.ok;
  } catch {
    return false;
  }
}
