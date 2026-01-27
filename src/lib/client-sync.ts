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
  };
}

/**
 * Fetch all clients from Supabase
 */
export async function fetchClientsFromDb(): Promise<ClientProfile[]> {
  try {
    const response = await fetch('/api/clients', {
      credentials: 'include', // Ensure cookies are sent
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ClientSync] Not authenticated, using local storage');
        return [];
      }
      throw new Error('Failed to fetch clients');
    }
    
    const data = await response.json();
    return (data.clients || []).map(dbClientToStoreClient);
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
      throw new Error(errorData.error || 'Failed to sync clients');
    }
    
    const data = await response.json();
    console.log(`[ClientSync] Synced: ${data.inserted} inserted, ${data.updated} updated`);
    
    return {
      success: true,
      clients: (data.clients || []).map(dbClientToStoreClient),
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
 */
export async function createClientInDb(client: ClientProfile): Promise<ClientProfile | null> {
  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeClientToApiFormat(client)),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create client');
    }
    
    const data = await response.json();
    return dbClientToStoreClient(data.client);
  } catch (error) {
    console.error('[ClientSync] Error creating client:', error);
    return null;
  }
}

/**
 * Update a client in Supabase
 */
export async function updateClientInDb(
  clientId: string,
  updates: Partial<ClientProfile>
): Promise<ClientProfile | null> {
  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update client');
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
    const response = await fetch('/api/clients');
    return response.ok;
  } catch {
    return false;
  }
}
