import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type StaffRecord = {
  role: string | null;
  canViewAllClients: boolean;
};

export type StaffSession = {
  user: User;
  staff: StaffRecord;
};

export async function getOptionalStaffSession(): Promise<StaffSession | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: staff } = await authClient
    .from('staff')
    .select('role, can_view_all_clients')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!staff) return null;

  return {
    user,
    staff: {
      role: (staff.role as string | null) || null,
      canViewAllClients: !!staff.can_view_all_clients,
    },
  };
}

export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getOptionalStaffSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdminSession(): Promise<StaffSession> {
  const session = await requireStaffSession();
  if (session.staff.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}
