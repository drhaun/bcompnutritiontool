import { NextResponse } from 'next/server';

/**
 * POST /api/fullscript/session-grant
 *
 * Creates a session grant (secretToken) for the Fullscript Embed SDK.
 * Returns 501 until Fullscript OAuth is fully configured.
 *
 * Prerequisites (see https://fullscript.dev/docs/how-to-guides/fullscript-embed/using-fullscript-embed/oauth-and-backend-work):
 *   1. Create an App in the Fullscript API Dashboard (https://fullscript.dev/applications)
 *      - Configure OAuth scopes: Clinic:read, Clinic:write, Patients:write, Patients:treatment_plan_history
 *      - Set the redirect URI for the OAuth callback
 *   2. Add FULLSCRIPT_CLIENT_ID and FULLSCRIPT_CLIENT_SECRET to .env.local
 *   3. Implement the OAuth connect/callback flow to obtain and store the practitioner's access_token
 *   4. Use the stored access_token here to call the session_grants endpoint
 *
 * Session grant endpoint (sandbox):
 *   POST https://api-us-snd.fullscript.io/api/clinic/embeddable/session_grants
 *   Authorization: Bearer <practitioner_access_token>
 *   Content-Type: application/json
 *
 * Session grant endpoint (production):
 *   POST https://api.fullscript.com/api/clinic/embeddable/session_grants
 *   Authorization: Bearer <practitioner_access_token>
 *   Content-Type: application/json
 *
 * The secret_token returned is single-use and must be consumed within 120 seconds.
 */
export async function POST() {
  const clientId = process.env.FULLSCRIPT_CLIENT_ID;
  const clientSecret = process.env.FULLSCRIPT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Fullscript OAuth not configured — add FULLSCRIPT_CLIENT_ID and FULLSCRIPT_CLIENT_SECRET to env' },
      { status: 501 },
    );
  }

  // TODO: When OAuth is fully implemented:
  // 1. Look up the logged-in staff member's Fullscript access_token from the database
  // 2. Call the session_grants endpoint:
  //
  //    const fsEnv = process.env.NEXT_PUBLIC_FULLSCRIPT_ENV || 'us-snd';
  //    const apiBase = fsEnv.includes('snd') ? 'https://api-us-snd.fullscript.io' : 'https://api.fullscript.com';
  //    const res = await fetch(`${apiBase}/api/clinic/embeddable/session_grants`, {
  //      method: 'POST',
  //      headers: {
  //        'Content-Type': 'application/json',
  //        'Authorization': `Bearer ${practitionerAccessToken}`,
  //      },
  //    });
  //    const data = await res.json();
  //    return NextResponse.json({ secretToken: data.data.attributes.secret_token });

  return NextResponse.json(
    { error: 'Fullscript OAuth flow not yet implemented' },
    { status: 501 },
  );
}
