import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

async function createAuthClient() {
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

export async function requireClientRouteAccess(clientId: string): Promise<{ user: User; canViewAllClients: boolean }> {
  const supabase = await createAuthClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('UNAUTHORIZED');
  }

  const { data: staffRecord } = await supabase
    .from('staff')
    .select('role, can_view_all_clients')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const canViewAllClients = staffRecord?.role === 'admin' || staffRecord?.can_view_all_clients === true;

  let query = supabase
    .from('clients')
    .select('id')
    .eq('id', clientId);

  if (!canViewAllClients) {
    query = query.eq('coach_id', user.id);
  }

  const { data: client } = await query.maybeSingle();
  if (!client) {
    throw new Error('NOT_FOUND');
  }

  return { user, canViewAllClients };
}
