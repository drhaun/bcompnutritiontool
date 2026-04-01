import { NextResponse } from 'next/server';
import { isInstacartConfigured } from '@/lib/instacart-client';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ configured: isInstacartConfigured() });
  } catch {
    return NextResponse.json({ configured: false }, { status: 500 });
  }
}
