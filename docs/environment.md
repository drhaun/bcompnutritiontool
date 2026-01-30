# Environment Variables

Create a `.env.local` file in the project root with:

```
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI API Key (for AI features)
OPENAI_API_KEY=

# Cronometer API (required for Cronometer integration)
CRONOMETER_CLIENT_ID=
CRONOMETER_CLIENT_SECRET=

# Optional: Persist Cronometer OAuth token for local development
# Get these values after completing OAuth flow once (check browser dev tools → Cookies)
# This avoids re-authenticating every time you restart the dev server
CRONOMETER_ACCESS_TOKEN=
CRONOMETER_USER_ID=
```

To run without Supabase for local testing, set:

```
NEXT_PUBLIC_LOCAL_ONLY=true
```

## Getting Cronometer Token for Local Development

1. Start your local dev server: `npm run dev`
2. Go to Settings → Connect to Cronometer
3. Complete the OAuth flow
4. Open browser dev tools → Application → Cookies → localhost
5. Copy the values of `cronometer_access_token` and `cronometer_user_id`
6. Add them to your `.env.local` file
7. Restart the dev server

The token persists until you revoke access in Cronometer, so you only need to do this once.
