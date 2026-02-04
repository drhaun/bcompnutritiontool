import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create admin client with service role key for user management
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

// Get regular client for auth checks
function getClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Check if current user is admin
async function isCurrentUserAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();
  
  return staff?.role === 'admin';
}

/**
 * GET /api/admin/users - List all auth users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getClient();
    const adminClient = getAdminClient();
    
    if (!supabase || !adminClient) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    }
    
    // Check admin status
    const isAdmin = await isCurrentUserAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    // Use admin client to list all users
    const { data, error } = await adminClient.auth.admin.listUsers();
    
    if (error) {
      console.error('[Admin API] listUsers error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Map to simplified user objects
    const users = data.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
    }));
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users - Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getClient();
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
    const { email, password, name, role } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    
    // Create auth user
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: role || 'coach' },
    });
    
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }
    
    // Create staff record
    if (userData.user) {
      const { error: staffError } = await adminClient
        .from('staff')
        .insert({
          auth_user_id: userData.user.id,
          email,
          name: name || null,
          role: role || 'coach',
        });
      
      if (staffError) {
        console.error('[Admin API] Staff insert error:', staffError);
        // User was created but staff record failed - log but don't fail
      }
    }
    
    return NextResponse.json({ 
      user: userData.user,
      message: 'User created successfully' 
    });
    
  } catch (error) {
    console.error('[Admin API] Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
