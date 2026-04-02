/**
 * Kroger API client — handles OAuth token management and API calls.
 *
 * Auth modes:
 * 1. Service-to-service (client credentials) — for product search & locations
 * 2. Admin master auth (authorization code, tokens in DB) — for cart operations on behalf of clients
 * 3. Customer auth (authorization code, tokens in cookies) — legacy / direct customer mode
 */

import { createServerClient } from '@/lib/supabase';

const KROGER_BASE = process.env.KROGER_API_BASE || 'https://api.kroger.com/v1';
// All endpoints (OAuth + data APIs) must use the same environment where the app
// is registered. The cert environment (api-ce.kroger.com) serves both the
// user-facing login page and the data APIs.
const KROGER_AUTH = `${KROGER_BASE}/connect/oauth2`;

function getCredentials() {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function basicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

// ── Service-to-service token (cached in memory) ──────────────────────────

let s2sToken: string | null = null;
let s2sExpiresAt = 0;

export async function getServiceToken(): Promise<string> {
  if (s2sToken && Date.now() < s2sExpiresAt) return s2sToken;

  const creds = getCredentials();
  if (!creds) throw new Error('Kroger credentials not configured');

  const res = await fetch(`${KROGER_AUTH}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(creds.clientId, creds.clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger S2S token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  s2sToken = data.access_token as string;
  s2sExpiresAt = Date.now() + (data.expires_in as number) * 1000 - 60_000; // 1-min buffer
  return s2sToken;
}

// ── Customer OAuth helpers ───────────────────────────────────────────────

/**
 * Generate a PKCE code verifier (random 43-128 char string).
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64url');
}

/**
 * Derive the S256 code challenge from a code verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const { createHash } = await import('crypto');
  const hash = createHash('sha256').update(verifier).digest();
  return Buffer.from(hash).toString('base64url');
}

export async function getAuthorizationUrl(
  state: string,
  codeChallenge?: string,
  overrideRedirectUri?: string
): Promise<string> {
  const creds = getCredentials();
  if (!creds) throw new Error('Kroger credentials not configured');
  if (!overrideRedirectUri) throw new Error('redirectUri is required for Kroger OAuth');
  const redirectUri = overrideRedirectUri;
  const scope = process.env.KROGER_SCOPES || 'product.compact cart.basic:write';

  const paramObj: Record<string, string> = {
    scope,
    response_type: 'code',
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    state,
  };

  if (codeChallenge) {
    paramObj.code_challenge = codeChallenge;
    paramObj.code_challenge_method = 'S256';
  }

  const params = new URLSearchParams(paramObj);
  return `${KROGER_AUTH}/authorize?${params}`;
}

export async function exchangeCode(code: string, codeVerifier?: string, overrideRedirectUri?: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const creds = getCredentials();
  if (!creds) throw new Error('Kroger credentials not configured');
  if (!overrideRedirectUri) throw new Error('redirectUri is required for Kroger OAuth');
  const redirectUri = overrideRedirectUri;

  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  };
  if (codeVerifier) {
    bodyParams.code_verifier = codeVerifier;
  }

  const res = await fetch(`${KROGER_AUTH}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(creds.clientId, creds.clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(bodyParams).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger token exchange error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

class KrogerRefreshError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'KrogerRefreshError';
    this.status = status;
  }
}

export async function refreshCustomerToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const creds = getCredentials();
  if (!creds) throw new Error('Kroger credentials not configured');

  const res = await fetch(`${KROGER_AUTH}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(creds.clientId, creds.clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new KrogerRefreshError(res.status, `Kroger refresh error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ── API call helpers ─────────────────────────────────────────────────────

export async function krogerGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${KROGER_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger GET ${path} error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function krogerPut(path: string, token: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${KROGER_BASE}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger PUT ${path} error ${res.status}: ${text}`);
  }
  if (res.status === 204) return { success: true };
  return res.json();
}

// ── Admin master account helpers (tokens stored in DB) ───────────────────

/**
 * Save Kroger tokens for a staff member in the database.
 */
export async function saveAdminKrogerTokens(
  staffId: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
): Promise<boolean> {
  const db = createServerClient();
  if (!db) return false;

  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const { error } = await db
    .from('staff')
    .update({
      kroger_access_token: tokens.accessToken,
      kroger_refresh_token: tokens.refreshToken,
      kroger_token_expires_at: expiresAt.toISOString(),
      kroger_connected_at: new Date().toISOString(),
    })
    .eq('id', staffId);

  if (error) {
    console.error('[Kroger] Failed to save admin tokens:', error);
    return false;
  }
  return true;
}

/**
 * Get a valid Kroger access token for the admin (staff) master account.
 * Automatically refreshes if expired, with retry on transient failures.
 */
export async function getAdminKrogerToken(staffId: string): Promise<string | null> {
  const db = createServerClient();
  if (!db) return null;

  const { data: staff, error } = await db
    .from('staff')
    .select('kroger_access_token, kroger_refresh_token, kroger_token_expires_at')
    .eq('id', staffId)
    .single();

  if (error || !staff?.kroger_refresh_token) return null;

  const expiresAt = staff.kroger_token_expires_at
    ? new Date(staff.kroger_token_expires_at).getTime()
    : 0;

  if (staff.kroger_access_token && Date.now() < expiresAt - 60_000) {
    return staff.kroger_access_token;
  }

  // Token expired — attempt refresh with one retry for transient failures
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const refreshed = await refreshCustomerToken(staff.kroger_refresh_token);
      await saveAdminKrogerTokens(staffId, refreshed);
      return refreshed.accessToken;
    } catch (err) {
      const isAuthError =
        err instanceof KrogerRefreshError && (err.status === 400 || err.status === 401);

      if (isAuthError) {
        console.error('[Kroger] Refresh token revoked/invalid, clearing tokens:', err);
        await db.from('staff').update({
          kroger_access_token: null,
          kroger_refresh_token: null,
          kroger_token_expires_at: null,
          kroger_connected_at: null,
        }).eq('id', staffId);
        return null;
      }

      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[Kroger] Transient refresh failure (attempt ${attempt}), retrying...`, err);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      console.error('[Kroger] Refresh failed after retries (keeping tokens for next attempt):', err);
      return null;
    }
  }
  return null;
}

/**
 * Check if a staff member has Kroger connected.
 */
export async function isAdminKrogerConnected(staffId: string): Promise<boolean> {
  const db = createServerClient();
  if (!db) return false;

  const { data } = await db
    .from('staff')
    .select('kroger_refresh_token')
    .eq('id', staffId)
    .single();

  return !!data?.kroger_refresh_token;
}

/**
 * Disconnect Kroger from a staff account.
 */
export async function disconnectAdminKroger(staffId: string): Promise<boolean> {
  const db = createServerClient();
  if (!db) return false;

  const { error } = await db
    .from('staff')
    .update({
      kroger_access_token: null,
      kroger_refresh_token: null,
      kroger_token_expires_at: null,
      kroger_connected_at: null,
    })
    .eq('id', staffId);

  return !error;
}

// ── Per-client Kroger token helpers (tokens stored in DB on clients table) ──

/**
 * Save Kroger tokens for a client in the database.
 */
export async function saveClientKrogerTokens(
  clientId: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): Promise<boolean> {
  const db = createServerClient();
  if (!db) return false;

  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const { error } = await db
    .from('clients')
    .update({
      kroger_access_token: tokens.accessToken,
      kroger_refresh_token: tokens.refreshToken,
      kroger_token_expires_at: expiresAt.toISOString(),
      kroger_connected_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (error) {
    console.error('[Kroger] Failed to save client tokens:', error);
    return false;
  }
  return true;
}

/**
 * Get a valid Kroger access token for a client's own account.
 * Automatically refreshes if expired, with retry on transient failures.
 */
export async function getClientKrogerToken(clientId: string): Promise<string | null> {
  const db = createServerClient();
  if (!db) return null;

  const { data: client, error } = await db
    .from('clients')
    .select('kroger_access_token, kroger_refresh_token, kroger_token_expires_at')
    .eq('id', clientId)
    .single();

  if (error || !client?.kroger_refresh_token) return null;

  const expiresAt = client.kroger_token_expires_at
    ? new Date(client.kroger_token_expires_at).getTime()
    : 0;

  if (client.kroger_access_token && Date.now() < expiresAt - 60_000) {
    return client.kroger_access_token;
  }

  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const refreshed = await refreshCustomerToken(client.kroger_refresh_token);
      await saveClientKrogerTokens(clientId, refreshed);
      return refreshed.accessToken;
    } catch (err) {
      const isAuthError =
        err instanceof KrogerRefreshError && (err.status === 400 || err.status === 401);

      if (isAuthError) {
        console.error('[Kroger] Client refresh token revoked/invalid, clearing:', err);
        await db.from('clients').update({
          kroger_access_token: null,
          kroger_refresh_token: null,
          kroger_token_expires_at: null,
          kroger_connected_at: null,
        }).eq('id', clientId);
        return null;
      }

      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[Kroger] Client transient refresh failure (attempt ${attempt}), retrying...`, err);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      console.error('[Kroger] Client refresh failed after retries (keeping tokens):', err);
      return null;
    }
  }
  return null;
}

/**
 * Check if a client has their own Kroger account connected.
 */
export async function isClientKrogerConnected(clientId: string): Promise<boolean> {
  const db = createServerClient();
  if (!db) return false;

  const { data } = await db
    .from('clients')
    .select('kroger_refresh_token')
    .eq('id', clientId)
    .single();

  return !!data?.kroger_refresh_token;
}

/**
 * Disconnect Kroger from a client account.
 */
export async function disconnectClientKroger(clientId: string): Promise<boolean> {
  const db = createServerClient();
  if (!db) return false;

  const { error } = await db
    .from('clients')
    .update({
      kroger_access_token: null,
      kroger_refresh_token: null,
      kroger_token_expires_at: null,
      kroger_connected_at: null,
    })
    .eq('id', clientId);

  return !error;
}

// ── Shared staff helpers ─────────────────────────────────────────────────

/**
 * Get the staff record for the currently authenticated user.
 */
export async function getStaffFromAuthUser(authUserId: string): Promise<{ id: string; role: string } | null> {
  const db = createServerClient();
  if (!db) return null;

  const { data } = await db
    .from('staff')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single();

  return data || null;
}

/**
 * Get grocery markup settings for a staff member.
 */
export async function getStaffMarkupSettings(staffId: string): Promise<{
  markupType: 'percentage' | 'flat';
  markupValue: number;
} | null> {
  const db = createServerClient();
  if (!db) return null;

  const { data } = await db
    .from('staff')
    .select('grocery_markup_type, grocery_markup_value')
    .eq('id', staffId)
    .single();

  if (!data) return null;
  return {
    markupType: data.grocery_markup_type || 'percentage',
    markupValue: data.grocery_markup_value || 15,
  };
}
