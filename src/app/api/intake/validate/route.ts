import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Mode 1: Validate an existing token
    if (body.token) {
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, name, email, user_profile, diet_preferences, weekly_schedule, intake_status, intake_token_expires_at')
        .eq('intake_token', body.token)
        .single();

      if (error || !client) {
        return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
      }

      if (client.intake_token_expires_at && new Date(client.intake_token_expires_at) < new Date()) {
        return NextResponse.json({ error: 'This intake link has expired. Please request a new one from your coach.' }, { status: 410 });
      }

      // Check if client is tagged to a group and return the slug
      let groupSlug: string | null = null;
      const { data: tags } = await supabase
        .from('client_group_tags')
        .select('group_id')
        .eq('client_id', client.id)
        .limit(1);
      if (tags?.length) {
        const { data: group } = await supabase
          .from('client_groups')
          .select('slug')
          .eq('id', tags[0].group_id)
          .single();
        if (group) groupSlug = group.slug;
      }

      return NextResponse.json({
        clientId: client.id,
        name: client.name,
        email: client.email,
        userProfile: client.user_profile || {},
        dietPreferences: client.diet_preferences || {},
        weeklySchedule: client.weekly_schedule || {},
        intakeStatus: client.intake_status,
        groupSlug,
      });
    }

    // Mode 2: Self-signup with name + email
    if (body.name && body.email) {
      const email = body.email.trim().toLowerCase();
      const name = body.name.trim();

      // Check if there's already a pending intake for this email
      const { data: existing } = await supabase
        .from('clients')
        .select('id, intake_token, intake_status')
        .eq('email', email)
        .in('intake_status', ['pending', 'in_progress'])
        .limit(1)
        .single();

      if (existing?.intake_token) {
        return NextResponse.json({ token: existing.intake_token, clientId: existing.id, resumed: true });
      }

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          name,
          email,
          coach_id: null,
          intake_token: token,
          intake_token_expires_at: expiresAt,
          intake_status: 'pending',
          user_profile: { name, gender: 'Male', age: 30, heightFt: 5, heightIn: 10, heightCm: 178, weightLbs: 170, weightKg: 77, bodyFatPercentage: 20 },
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Intake Validate] Insert error:', error);
        return NextResponse.json({ error: 'Failed to create intake record' }, { status: 500 });
      }

      // Tag client into the group if groupSlug provided
      if (body.groupSlug && newClient) {
        const { data: group } = await supabase
          .from('client_groups')
          .select('id')
          .eq('slug', body.groupSlug)
          .single();
        if (group) {
          await supabase.from('client_group_tags').insert({ client_id: newClient.id, group_id: group.id });
        }
      }

      return NextResponse.json({ token, clientId: newClient!.id, resumed: false });
    }

    return NextResponse.json({ error: 'Provide either a token or name+email' }, { status: 400 });
  } catch (err) {
    console.error('[Intake Validate] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
