/**
 * DEBUG: View all clients in database (for troubleshooting)
 * This bypasses the coach_id filter to see orphaned clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  
  try {
    // Get ALL clients without filtering
    const { data: allClients, error: allError } = await supabase
      .from('clients')
      .select('id, name, status, coach_id, created_at, updated_at')
      .order('updated_at', { ascending: false });
    
    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }
    
    // Group by coach_id
    const byCoach: Record<string, any[]> = {};
    const orphaned: any[] = [];
    
    for (const client of allClients || []) {
      if (client.coach_id) {
        if (!byCoach[client.coach_id]) {
          byCoach[client.coach_id] = [];
        }
        byCoach[client.coach_id].push(client);
      } else {
        orphaned.push(client);
      }
    }
    
    // Get all users for reference
    const { data: users } = await supabase.auth.admin.listUsers();
    
    return NextResponse.json({
      totalClients: allClients?.length || 0,
      orphanedClients: orphaned.length,
      clientsByCoach: Object.entries(byCoach).map(([coachId, clients]) => ({
        coachId,
        clientCount: clients.length,
        clients: clients.map(c => ({ id: c.id, name: c.name, status: c.status })),
      })),
      orphaned: orphaned.map(c => ({ id: c.id, name: c.name, status: c.status })),
      users: users?.users?.map(u => ({ id: u.id, email: u.email })) || [],
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
