/**
 * Cronometer Token Resolution & Persistence
 * 
 * Solves the multi-device authentication persistence problem by storing
 * Cronometer OAuth tokens in the Supabase database (staff table), keyed
 * to the authenticated staff user. This way all devices sharing the same
 * staff login automatically share the same Cronometer token.
 * 
 * Token resolution priority:
 *   1. Database (source of truth — always has the latest token from any device)
 *   2. Cookie (fast fallback when DB is unavailable or user not authenticated)
 *   3. Environment variable (local development convenience)
 * 
 * When the database token is resolved, cookies are backfilled on the response
 * so subsequent requests on the same device are fast. If a cookie holds a stale
 * token (e.g. another device re-authorized), the database token takes precedence
 * and the cookie is overwritten.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================
// TOKEN RESOLUTION
// ============================================================

export interface CronometerTokenResult {
  accessToken: string | null;
  userId: string | null;
  source: 'cookie' | 'database' | 'env' | null;
  /** The Supabase staff auth_user_id (if resolved via DB or Supabase session) */
  staffAuthUserId?: string;
  /** True if the DB token differs from the cookie token (cookie is stale) */
  cookieStale?: boolean;
}

/**
 * Resolve the Cronometer access token from multiple sources.
 * Priority: Database → Cookie → Environment variable
 * 
 * The database is checked first because it is the single source of truth.
 * When a user re-authorizes on any device, the new token is saved to the DB.
 * Other devices may still have the old (now-revoked) token in their cookies.
 * By checking the DB first, we always get the latest valid token.
 */
export async function resolveCronometerToken(
  request: NextRequest
): Promise<CronometerTokenResult> {
  // Read cookies (we may need them for fallback or staleness check)
  const cookieToken = request.cookies.get('cronometer_access_token')?.value;
  const cookieUserId = request.cookies.get('cronometer_user_id')?.value;

  // 1. Try database first (source of truth — always has the latest token)
  try {
    const dbResult = await getTokenFromDatabase(request);
    if (dbResult) {
      const cookieStale = !!(cookieToken && cookieToken !== dbResult.accessToken);
      if (cookieStale) {
        console.log('[CronometerToken] Cookie token is stale — using fresher database token');
      }
      return {
        accessToken: dbResult.accessToken,
        userId: dbResult.userId,
        source: 'database',
        staffAuthUserId: dbResult.staffAuthUserId,
        cookieStale,
      };
    }
  } catch (error) {
    console.error('[CronometerToken] Database lookup failed, falling back to cookie:', error);
  }

  // 2. Fall back to cookie (when DB is unavailable or user not authenticated via Supabase)
  if (cookieToken && cookieUserId) {
    return { accessToken: cookieToken, userId: cookieUserId, source: 'cookie' };
  }

  // 3. Fall back to environment variables (for local development)
  const envToken = process.env.CRONOMETER_ACCESS_TOKEN;
  const envUserId = process.env.CRONOMETER_USER_ID;

  if (envToken) {
    return { accessToken: envToken, userId: envUserId || null, source: 'env' };
  }

  return { accessToken: null, userId: null, source: null };
}

/**
 * If the token was resolved from the database, set/update the cookies on the
 * response so subsequent requests on this device are fast and consistent.
 * This also overwrites stale cookies with the latest token.
 */
export function backfillCronometerCookies<T>(
  response: NextResponse<T>,
  tokenResult: CronometerTokenResult
): NextResponse<T> {
  if (tokenResult.source === 'database' && tokenResult.accessToken && tokenResult.userId) {
    response.cookies.set('cronometer_access_token', tokenResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    response.cookies.set('cronometer_user_id', tokenResult.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    if (tokenResult.cookieStale) {
      console.log('[CronometerToken] Overwrote stale cookie with fresh database token');
    }
  }
  return response;
}

// ============================================================
// TOKEN STORAGE (save to database)
// ============================================================

/**
 * Save the Cronometer token to the staff record in Supabase.
 * Called after a successful OAuth token exchange.
 */
export async function saveCronometerTokenToDatabase(
  request: NextRequest,
  accessToken: string,
  cronometerUserId: string
): Promise<boolean> {
  try {
    const staffAuthUserId = await getAuthenticatedUserId(request);
    if (!staffAuthUserId) {
      console.warn('[CronometerToken] No authenticated user found - cannot save token to DB');
      return false;
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.warn('[CronometerToken] Admin client not available - cannot save token to DB');
      return false;
    }

    const { error } = await adminClient
      .from('staff')
      .update({
        cronometer_access_token: accessToken,
        cronometer_user_id: cronometerUserId,
        cronometer_connected_at: new Date().toISOString(),
      })
      .eq('auth_user_id', staffAuthUserId);

    if (error) {
      console.error('[CronometerToken] Failed to save token to DB:', error.message);
      return false;
    }

    console.log('[CronometerToken] Token saved to database for staff user:', staffAuthUserId);
    return true;
  } catch (error) {
    console.error('[CronometerToken] Error saving token to DB:', error);
    return false;
  }
}

/**
 * Clear the Cronometer token from the staff record in Supabase.
 * Called when the user disconnects from Cronometer.
 */
export async function clearCronometerTokenFromDatabase(
  request: NextRequest
): Promise<boolean> {
  try {
    const staffAuthUserId = await getAuthenticatedUserId(request);
    if (!staffAuthUserId) {
      console.warn('[CronometerToken] No authenticated user found - cannot clear token from DB');
      return false;
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.warn('[CronometerToken] Admin client not available - cannot clear token from DB');
      return false;
    }

    const { error } = await adminClient
      .from('staff')
      .update({
        cronometer_access_token: null,
        cronometer_user_id: null,
        cronometer_connected_at: null,
      })
      .eq('auth_user_id', staffAuthUserId);

    if (error) {
      console.error('[CronometerToken] Failed to clear token from DB:', error.message);
      return false;
    }

    console.log('[CronometerToken] Token cleared from database for staff user:', staffAuthUserId);
    return true;
  } catch (error) {
    console.error('[CronometerToken] Error clearing token from DB:', error);
    return false;
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Look up the Cronometer token from the database via the authenticated
 * Supabase user's session.
 */
async function getTokenFromDatabase(
  request: NextRequest
): Promise<{ accessToken: string; userId: string; staffAuthUserId: string } | null> {
  const staffAuthUserId = await getAuthenticatedUserId(request);
  if (!staffAuthUserId) return null;

  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data: staff, error } = await adminClient
    .from('staff')
    .select('cronometer_access_token, cronometer_user_id')
    .eq('auth_user_id', staffAuthUserId)
    .single();

  if (error || !staff?.cronometer_access_token || !staff?.cronometer_user_id) {
    return null;
  }

  return {
    accessToken: staff.cronometer_access_token,
    userId: staff.cronometer_user_id,
    staffAuthUserId,
  };
}

/**
 * Get the authenticated Supabase user ID from the request cookies.
 * Uses @supabase/ssr to properly handle chunked session cookies.
 */
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    // Create a Supabase client that reads session from request cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Read-only in this context - we don't need to set cookies here
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return user.id;
  } catch (error) {
    console.error('[CronometerToken] Failed to get authenticated user:', error);
    return null;
  }
}

/**
 * Create a Supabase admin client using the service role key.
 * This bypasses RLS and can read/write any staff record.
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================
// LOCAL DEV: Auto-persist tokens to .env.local
// ============================================================

/**
 * In development mode, automatically update the CRONOMETER_ACCESS_TOKEN
 * and CRONOMETER_USER_ID values in .env.local so they survive server
 * restarts without manual copying from browser dev tools.
 */
export function persistTokenToEnvFile(accessToken: string, userId: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    const envPath = join(process.cwd(), '.env.local');
    let envContent: string;

    try {
      envContent = readFileSync(envPath, 'utf-8');
    } catch {
      // .env.local doesn't exist — nothing to update
      console.warn('[CronometerToken] .env.local not found — skipping token persistence');
      return;
    }

    // Replace or append CRONOMETER_ACCESS_TOKEN
    if (envContent.match(/^CRONOMETER_ACCESS_TOKEN=.*/m)) {
      envContent = envContent.replace(
        /^CRONOMETER_ACCESS_TOKEN=.*/m,
        `CRONOMETER_ACCESS_TOKEN=${accessToken}`
      );
    } else {
      envContent += `\nCRONOMETER_ACCESS_TOKEN=${accessToken}`;
    }

    // Replace or append CRONOMETER_USER_ID
    if (envContent.match(/^CRONOMETER_USER_ID=.*/m)) {
      envContent = envContent.replace(
        /^CRONOMETER_USER_ID=.*/m,
        `CRONOMETER_USER_ID=${userId}`
      );
    } else {
      envContent += `\nCRONOMETER_USER_ID=${userId}`;
    }

    writeFileSync(envPath, envContent, 'utf-8');
    console.log('[CronometerToken] ✅ Tokens auto-saved to .env.local — no more re-auth on restart!');
  } catch (error) {
    console.error('[CronometerToken] Failed to persist token to .env.local:', error);
  }
}
