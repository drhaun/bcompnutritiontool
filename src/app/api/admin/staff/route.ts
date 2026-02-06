import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create admin client with service role key for staff management
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Get client that uses cookies for session (to verify admin status)
async function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });
}

// Check if current user is admin
async function isCurrentUserAdmin(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('[Admin Staff API] getUser result:', user?.id, 'error:', error?.message);
  if (!user) return false;
  
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();
  
  console.log('[Admin Staff API] Staff check:', staff?.role, 'error:', staffError?.message);
  return staff?.role === 'admin';
}

/**
 * POST /api/admin/staff - Create a staff record (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const adminClient = getAdminClient();
    
    if (!supabase || !adminClient) {
      console.error('[Admin Staff API] Supabase not configured');
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Check admin status using cookie-based session
    const isAdmin = await isCurrentUserAdmin(supabase);
    console.log('[Admin Staff API] isAdmin check result:', isAdmin);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { authUserId, email, name, role, canViewAllClients } = body;
    
    if (!authUserId || !email) {
      return NextResponse.json({ error: 'authUserId and email are required' }, { status: 400 });
    }
    
    console.log('[Admin Staff API] Creating staff record for:', authUserId, email, role);
    
    // Check if staff record already exists
    const { data: existingStaff } = await adminClient
      .from('staff')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();
    
    if (existingStaff) {
      return NextResponse.json({ error: 'Staff record already exists for this user' }, { status: 409 });
    }
    
    // Create staff record using admin client (bypasses RLS)
    const { data: staffRecord, error: staffError } = await adminClient
      .from('staff')
      .insert({
        auth_user_id: authUserId,
        email,
        name: name || null,
        role: role || 'coach',
        can_view_all_clients: canViewAllClients || false,
      })
      .select()
      .single();
    
    if (staffError) {
      console.error('[Admin Staff API] Insert error:', staffError);
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }
    
    console.log('[Admin Staff API] Staff record created:', staffRecord.id);
    return NextResponse.json({ 
      staff: staffRecord,
      message: 'Staff record created successfully' 
    });
    
  } catch (error) {
    console.error('[Admin Staff API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/staff - Update a staff record (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const adminClient = getAdminClient();
    
    if (!supabase || !adminClient) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Check admin status
    const isAdmin = await isCurrentUserAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { staffId, name, role, isActive, canViewAllClients, permissions } = body;
    
    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }
    
    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (canViewAllClients !== undefined) updateData.can_view_all_clients = canViewAllClients;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    console.log('[Admin Staff API] Updating staff:', staffId, 'with:', updateData);
    
    // Update using admin client (bypasses RLS)
    const { data: updatedStaff, error: updateError } = await adminClient
      .from('staff')
      .update(updateData)
      .eq('id', staffId)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Admin Staff API] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    console.log('[Admin Staff API] Staff updated:', updatedStaff.id);
    return NextResponse.json({ 
      staff: updatedStaff,
      message: 'Staff record updated successfully' 
    });
    
  } catch (error) {
    console.error('[Admin Staff API] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
