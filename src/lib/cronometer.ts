/**
 * Cronometer API Service
 * 
 * Handles OAuth flow and API calls to Cronometer for Pro accounts.
 * Allows fetching client nutrition data for analysis.
 */

const CRONOMETER_API_BASE = 'https://cronometer.com/api_v1';
const CRONOMETER_OAUTH_BASE = 'https://cronometer.com/oauth';

// Get credentials from environment
export function getCronometerCredentials() {
  return {
    clientId: process.env.CRONOMETER_CLIENT_ID || '',
    clientSecret: process.env.CRONOMETER_CLIENT_SECRET || '',
  };
}

// Check if Cronometer is configured
export function isCronometerConfigured(): boolean {
  const { clientId, clientSecret } = getCronometerCredentials();
  return !!(clientId && clientSecret && 
    clientId !== 'your_client_id_here' && 
    clientSecret !== 'your_client_secret_here');
}

/**
 * Generate the OAuth authorization URL
 */
export function getAuthorizationUrl(redirectUri: string, state?: string): string {
  const { clientId } = getCronometerCredentials();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  
  if (state) {
    params.append('state', state);
  }
  
  return `${CRONOMETER_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  user_id: string;
}> {
  const { clientId, clientSecret } = getCronometerCredentials();
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
  });
  
  const response = await fetch(`${CRONOMETER_OAUTH_BASE}/token?${params.toString()}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to exchange code for token');
  }
  
  return response.json();
}

/**
 * Deauthorize a user (revoke access token)
 */
export async function deauthorizeUser(accessToken: string): Promise<void> {
  const params = new URLSearchParams({ access_token: accessToken });
  
  const response = await fetch(`${CRONOMETER_OAUTH_BASE}/deauthorize?${params.toString()}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to deauthorize');
  }
}

// ============ API CALLS ============

interface CronometerApiOptions {
  accessToken: string;
  clientId?: string; // Cronometer Pro client_id for viewing client data
}

/**
 * Get list of Pro clients
 */
export async function getProClients(accessToken: string): Promise<{
  clients: Array<{
    client_id: number;
    name: string;
    email?: string;
    status: 'EXTERNAL_CLIENT' | 'EXTERNAL_CLIENT_PENDING' | 'INTERNAL_CLIENT';
    last_activity?: string;
  }>;
}> {
  const response = await fetch(`${CRONOMETER_API_BASE}/client_status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}), // Empty body returns all clients
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get clients');
  }
  
  return response.json();
}

/**
 * Get data summary (list of days with data)
 */
export async function getDataSummary(
  options: CronometerApiOptions,
  startDate: string,
  endDate: string
): Promise<{
  days: string[];
  signup: string;
}> {
  const body: Record<string, string> = {
    start: startDate,
    end: endDate,
  };
  
  if (options.clientId) {
    body.client_id = options.clientId;
  }
  
  const response = await fetch(`${CRONOMETER_API_BASE}/data_summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get data summary');
  }
  
  return response.json();
}

/**
 * Get macro summary for a day
 */
export async function getMacroSummary(
  options: CronometerApiOptions,
  day: string
): Promise<{
  alcohol: number;
  fat: number;
  fiber: number;
  kcal: number;
  magnesium: number;
  net_carbs: number;
  potassium: number;
  protein: number;
  sodium: number;
  total_carbs: number;
}> {
  const body: Record<string, string> = { day };
  
  if (options.clientId) {
    body.client_id = options.clientId;
  }
  
  const response = await fetch(`${CRONOMETER_API_BASE}/macro_summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get macro summary');
  }
  
  return response.json();
}

/**
 * Full diary food entry
 */
export interface CronometerFoodEntry {
  name: string;
  serving: string;
}

/**
 * Meal group in diary
 */
export interface CronometerMealGroup {
  name: string; // "Breakfast", "Lunch", "Dinner", "Snacks"
  foods: CronometerFoodEntry[];
  macros: {
    alcohol: number;
    fat: number;
    fiber: number;
    kcal: number;
    magnesium: number;
    net_carbs: number;
    potassium: number;
    protein: number;
    sodium: number;
    total_carbs: number;
  };
}

/**
 * Full diary summary response
 */
export interface CronometerDiarySummary {
  completed: boolean;
  day: string;
  food_grams: number;
  foods?: CronometerMealGroup[];
  macros: {
    alcohol: number;
    fat: number;
    fiber: number;
    kcal: number;
    magnesium: number;
    net_carbs: number;
    potassium: number;
    protein: number;
    sodium: number;
    total_carbs: number;
  };
  nutrients: Record<string, number>;
  metrics: any[];
}

/**
 * Get detailed diary summary for a day or date range
 */
export async function getDiarySummary(
  options: CronometerApiOptions,
  params: {
    day?: string;
    start?: string;
    end?: string;
    food?: boolean; // Include food breakdown by meal
  }
): Promise<CronometerDiarySummary | CronometerDiarySummary[]> {
  const body: Record<string, any> = { ...params };
  
  if (options.clientId) {
    body.client_id = options.clientId;
  }
  
  const response = await fetch(`${CRONOMETER_API_BASE}/diary_summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get diary summary');
  }
  
  return response.json();
}

/**
 * Get nutrition targets
 */
export async function getNutritionTargets(
  options: CronometerApiOptions,
  day?: string
): Promise<Record<string, { min?: number; max?: number; unit: string }>> {
  const body: Record<string, string> = {};
  
  if (day) {
    body.day = day;
  }
  
  if (options.clientId) {
    body.client_id = options.clientId;
  }
  
  const response = await fetch(`${CRONOMETER_API_BASE}/targets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get targets');
  }
  
  return response.json();
}

/**
 * Get fasting summary
 */
export async function getFastingSummary(
  options: CronometerApiOptions,
  startDate: string,
  endDate: string
): Promise<{
  fasts: Array<{
    name: string;
    start: string;
    finish: string | null;
    comments: string;
  }>;
}> {
  const body: Record<string, string> = {
    start: startDate,
    end: endDate,
  };
  
  if (options.clientId) {
    body.client_id = options.clientId;
  }
  
  const response = await fetch(`${CRONOMETER_API_BASE}/fasting_summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get fasting summary');
  }
  
  return response.json();
}

/**
 * Invite a client to your Pro account
 */
export async function inviteClient(
  accessToken: string,
  name: string,
  email?: string
): Promise<{
  client_id: number;
  message: string;
}> {
  const body: Record<string, string> = { name };
  
  if (email) {
    body.email = email;
  }
  
  const response = await fetch(`${CRONOMETER_API_BASE}/client_invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to invite client');
  }
  
  return response.json();
}

/**
 * Remove a client from your Pro account
 */
export async function removeClient(
  accessToken: string,
  clientId: string
): Promise<{ success: string }> {
  const response = await fetch(`${CRONOMETER_API_BASE}/client_remove`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client_id: clientId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove client');
  }
  
  return response.json();
}
