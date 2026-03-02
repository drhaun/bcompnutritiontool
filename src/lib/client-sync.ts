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
    // Favorites and resources
    favoriteRecipes: dbClient.favorite_recipes || [],
    resources: dbClient.resources || [],
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Convert store format to API format
export function storeClientToApiFormat(client: ClientProfile) {
  // Sanitize: drop any non-UUID activePhaseId to prevent DB type errors
  const activePhaseId = client.activePhaseId && UUID_RE.test(client.activePhaseId)
    ? client.activePhaseId
    : null;

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
    activePhaseId,
    timelineEvents: client.timelineEvents || [],
    // Favorites and resources
    favoriteRecipes: client.favoriteRecipes || [],
    resources: client.resources || [],
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
  /** Raw unfiltered clients from DB — includes zombies for retry logic */
  allDbClients?: ClientProfile[];
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
    
    // Read locally-tracked deleted IDs to avoid re-introducing them
    const deletedIds: Set<string> = new Set(
      JSON.parse(typeof window !== 'undefined' ? (localStorage.getItem('fitomics-deleted-client-ids') || '[]') : '[]')
    );
    
    // Keep ALL clients from DB (unfiltered) for zombie detection / retry logic
    const allDbClients = (data.clients || []).map(dbClientToStoreClient);
    
    // Filter out deleted clients for the returned list
    const dbClients = allDbClients
      .filter((c: ClientProfile) => !deletedIds.has(c.id));
    
    if (allDbClients.length !== dbClients.length) {
      console.log('[ClientSync] Filtered out', allDbClients.length - dbClients.length, 'deleted clients from sync result');
    }
    
    // Only preserve truly NEW local clients (created < 24 hours ago) that aren't in DB yet.
    // Older clients missing from DB were likely deleted by another session — don't resurrect them.
    if (localClients.length > 0 && dbClients.length < localClients.length) {
      const dbIds = new Set(dbClients.map((c: ClientProfile) => c.id));
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const missingLocal = localClients.filter(c => {
        if (dbIds.has(c.id) || deletedIds.has(c.id)) return false;
        const age = Date.now() - new Date(c.createdAt || 0).getTime();
        return age < ONE_DAY;
      });
      if (missingLocal.length > 0) {
        console.log('[ClientSync] Preserving', missingLocal.length, 'recently-created local clients not yet in database');
        return {
          success: true,
          clients: [...dbClients, ...missingLocal],
          allDbClients,
        };
      }
      const staleDropped = localClients.filter(c => !dbIds.has(c.id) && !deletedIds.has(c.id)).length - missingLocal.length;
      if (staleDropped > 0) {
        console.log('[ClientSync] Dropped', staleDropped, 'stale local clients not in DB (likely deleted by another session)');
      }
    }
    
    return {
      success: true,
      clients: dbClients,
      allDbClients,
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
      // BUT: first check if this client was intentionally deleted - don't resurrect it!
      if (response.status === 404) {
        const deletedIds: Set<string> = new Set(
          JSON.parse(typeof window !== 'undefined' ? (localStorage.getItem('fitomics-deleted-client-ids') || '[]') : '[]')
        );
        
        if (deletedIds.has(clientId)) {
          console.log('[ClientSync] Client was intentionally deleted, NOT re-creating:', clientId);
          return null;
        }
        
        console.log('[ClientSync] Client not found in DB, creating new record for:', clientId);
        
        // Resolve name: prefer top-level name, then userProfile.name, then fallback
        const resolvedName = updates.name || updates.userProfile?.name || 'Unnamed Client';
        
        // Build a full client object for creation
        const newClient: ClientProfile = {
          id: clientId,
          name: resolvedName,
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
 * Returns 'verified' if confirmed deleted, 'unverified' if API returned OK but
 * couldn't confirm deletion, or false if the request failed.
 */
export async function deleteClientFromDb(clientId: string): Promise<'verified' | 'unverified' | false> {
  try {
    console.log('[ClientSync] Deleting client from database:', clientId);
    
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'DELETE',
      credentials: 'include', // Ensure auth cookies are sent
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ClientSync] Not authenticated, delete skipped for:', clientId);
        return false;
      }
      if (response.status === 404) {
        // Client doesn't exist in DB - that's fine, treat as verified deletion
        console.log('[ClientSync] Client not found in database (already deleted?):', clientId);
        return 'verified';
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('[ClientSync] Delete failed:', response.status, errorData);
      return false;
    }
    
    const data = await response.json();
    
    // Check if the API verified the deletion actually happened
    if (data.verified) {
      console.log('[ClientSync] Client deletion VERIFIED in database:', clientId, 'rows:', data.deletedCount);
      return 'verified';
    }
    
    // API returned OK but didn't verify deletion (shouldn't happen with new API, but handle gracefully)
    console.warn('[ClientSync] Client delete returned OK but unverified for:', clientId);
    return 'unverified';
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
