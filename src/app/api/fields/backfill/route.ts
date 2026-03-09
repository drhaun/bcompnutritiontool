import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncUnifiedFieldLibrary } from '@/lib/unified-field-library';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const result = await syncUnifiedFieldLibrary(supabase as never);
  return NextResponse.json({ success: true, ...result });
}
