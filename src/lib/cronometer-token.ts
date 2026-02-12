/**
 * Cronometer Token Resolution & Persistence
 *
 * All staff members on the team share ONE Cronometer Pro account. Cronometer
 * OAuth tokens are long-lived — they do NOT expire when another staff member
 * authenticates.  The only way a token is revoked is via the explicit
 * /oauth/deauthorize endpoint or from the Cronometer Sharing panel.
 *
 * Because of this, we implement **team-wide token sharing**:
 *
 *   1. When ANY staff member completes OAuth, the new token is saved to
 *      their staff row AND propagated to every other staff member so
 *      everyone always has a valid token.
 *
 *   2. When resolving a token, we first check the current user's DB row,
 *      then fall back to the most-recently-connected teammate's token,
 *      then cookies, then the .env.local fallback.
 *
 *   3. When disconnecting, we NEVER call Cronometer's deauthorize endpoint
 *      (which would revoke ALL tokens for the entire team). We only clear
 *      the current user's local DB entry and cookies.
 *
 * Token resolution priority:
 *   1. Current user's DB row  (fastest — already assigned to them)
 *   2. Any teammate's DB row  (team sharing — most recently connected)
 *   3. Cookie                 (device-local fallback)
 *   4. Environment variable   (local development convenience)
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
  source: 'cookie' | 'database' | 'database-team' | 'env' | null;
  /** The Supabase staff auth_user_id (if resolved via DB or Supabase session) */
  staffAuthUserId?: string;
  /** True if the DB token differs from the cookie token (cookie is stale) */
  cookieStale?: boolean;
}

/**
 * Resolve the Cronometer access token.
 *
 * Priority:
 *   1. Current user's DB row
 *   2. Any teammate's DB row (most recently connected)
 *   3. Cookie
 *   4. Environment variable
 */
export async function resolveCronometerToken(
  request: NextRequest
): Promise<CronometerTokenResult> {
  const cookieToken = request.cookies.get('cronometer_access_token')?.value;
  const cookieUserId = request.cookies.get('cronometer_user_id')?.value;

  // ── 1. Try the current user's own DB row ──────────────────────────────
  try {
    const staffAuthUserId = await getAuthenticatedUserId(request);

    if (staffAuthUserId) {
      const adminClient = createAdminClient();

      if (adminClient) {
        // Check current user's row first
        const { data: myRow } = await adminClient
          .from('staff')
          .select('cronometer_access_token, cronometer_user_id')
          .eq('auth_user_id', staffAuthUserId)
          .single();

        if (myRow?.cronometer_access_token && myRow?.cronometer_user_id) {
          const cookieStale = !!(cookieToken && cookieToken !== myRow.cronometer_access_token);
          if (cookieStale) {
            console.log('[CronometerToken] Cookie stale — using own DB token');
          }
          return {
            accessToken: myRow.cronometer_access_token,
            userId: myRow.cronometer_user_id,
            source: 'database',
            staffAuthUserId,
            cookieStale,
          };
        }

        // ── 2. Current user has no token — check teammates ────────────
        const { data: teammate } = await adminClient
          .from('staff')
          .select('cronometer_access_token, cronometer_user_id, auth_user_id')
          .not('cronometer_access_token', 'is', null)
          .not('cronometer_user_id', 'is', null)
          .order('cronometer_connected_at', { ascending: false })
          .limit(1)
          .single();

        if (teammate?.cronometer_access_token && teammate?.cronometer_user_id) {
          console.log(
            '[CronometerToken] Current user has no token — using teammate token from',
            teammate.auth_user_id
          );

          // Propagate the token to the current user's row so they have it
          // for next time (fire-and-forget, don't block on this)
          adminClient
            .from('staff')
            .update({
              cronometer_access_token: teammate.cronometer_access_token,
              cronometer_user_id: teammate.cronometer_user_id,
              cronometer_connected_at: new Date().toISOString(),
            })
            .eq('auth_user_id', staffAuthUserId)
            .then(({ error }) => {
              if (error) {
                console.warn('[CronometerToken] Failed to propagate team token:', error.message);
              } else {
                console.log('[CronometerToken] Propagated team token to current user');
              }
            });

          const cookieStale = !!(cookieToken && cookieToken !== teammate.cronometer_access_token);
          return {
            accessToken: teammate.cronometer_access_token,
            userId: teammate.cronometer_user_id,
            source: 'database-team',
            staffAuthUserId,
            cookieStale,
          };
        }
      }
    }
  } catch (error) {
    console.error('[CronometerToken] Database lookup failed, falling back:', error);
  }

  // ── 3. Cookie fallback ──────────────────────────────────────────────
  if (cookieToken && cookieUserId) {
    return { accessToken: cookieToken, userId: cookieUserId, source: 'cookie' };
  }

  // ── 4. Environment variable fallback (local dev) ────────────────────
  const envToken = process.env.CRONOMETER_ACCESS_TOKEN;
  const envUserId = process.env.CRONOMETER_USER_ID;

  if (envToken) {
    return { accessToken: envToken, userId: envUserId || null, source: 'env' };
  }

  return { accessToken: null, userId: null, source: null };
}

/**
 * If the token was resolved from the database, set/update the cookies on
 * the response so subsequent requests on this device are fast.
 */
export function backfillCronometerCookies<T>(
  response: NextResponse<T>,
  tokenResult: CronometerTokenResult
): NextResponse<T> {
  const fromDb = tokenResult.source === 'database' || tokenResult.source === 'database-team';
  if (fromDb && tokenResult.accessToken && tokenResult.userId) {
    response.cookies.set('cronometer_access_token', tokenResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
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
// TOKEN STORAGE
// ============================================================

/**
 * Save a new Cronometer token to the database.
 *
 * This saves it to the authenticating user's row AND propagates it to
 * every other staff member so the whole team stays connected.
 */
export async function saveCronometerTokenToDatabase(
  request: NextRequest,
  accessToken: string,
  cronometerUserId: string
): Promise<boolean> {
  try {
    const staffAuthUserId = await getAuthenticatedUserId(request);
    if (!staffAuthUserId) {
      console.warn('[CronometerToken] No authenticated user — cannot save token to DB');
      return false;
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.warn('[CronometerToken] Admin client not available — cannot save token to DB');
      return false;
    }

    const now = new Date().toISOString();

    // Save to the authenticating user's row
    const { error } = await adminClient
      .from('staff')
      .update({
        cronometer_access_token: accessToken,
        cronometer_user_id: cronometerUserId,
        cronometer_connected_at: now,
      })
      .eq('auth_user_id', staffAuthUserId);

    if (error) {
      console.error('[CronometerToken] Failed to save token to DB:', error.message);
      return false;
    }

    console.log('[CronometerToken] Token saved for staff user:', staffAuthUserId);

    // Propagate to ALL other active staff members so the whole team
    // has access without each person needing to OAuth individually.
    const { error: propagateError, count } = await adminClient
      .from('staff')
      .update({
        cronometer_access_token: accessToken,
        cronometer_user_id: cronometerUserId,
        cronometer_connected_at: now,
      })
      .neq('auth_user_id', staffAuthUserId)
      .eq('is_active', true);

    if (propagateError) {
      console.warn('[CronometerToken] Team propagation failed (non-fatal):', propagateError.message);
    } else {
      console.log(`[CronometerToken] Token propagated to ${count ?? 'all'} other staff members`);
    }

    return true;
  } catch (error) {
    console.error('[CronometerToken] Error saving token to DB:', error);
    return false;
  }
}

/**
 * Clear the Cronometer token from the CURRENT user's staff row only.
 *
 * IMPORTANT: This does NOT revoke the token on Cronometer's side and does
 * NOT affect other staff members. Revoking via the Cronometer API would
 * invalidate ALL tokens for the shared account, disconnecting the whole team.
 */
export async function clearCronometerTokenFromDatabase(
  request: NextRequest
): Promise<boolean> {
  try {
    const staffAuthUserId = await getAuthenticatedUserId(request);
    if (!staffAuthUserId) {
      console.warn('[CronometerToken] No authenticated user — cannot clear token from DB');
      return false;
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.warn('[CronometerToken] Admin client not available — cannot clear token from DB');
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

    console.log('[CronometerToken] Token cleared for staff user:', staffAuthUserId);
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
 * Get the authenticated Supabase user ID from the request cookies.
 */
async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Read-only — we don't need to set cookies here
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
 * Bypasses RLS and can read/write any staff record.
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
 * restarts.
 */
export function persistTokenToEnvFile(accessToken: string, userId: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    const envPath = join(process.cwd(), '.env.local');
    let envContent: string;

    try {
      envContent = readFileSync(envPath, 'utf-8');
    } catch {
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
    console.log('[CronometerToken] Tokens auto-saved to .env.local');
  } catch (error) {
    console.error('[CronometerToken] Failed to persist token to .env.local:', error);
  }
}
