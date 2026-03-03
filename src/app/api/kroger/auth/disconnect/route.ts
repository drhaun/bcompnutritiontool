import { NextResponse } from 'next/server';
import { clearTokenCookies } from '@/lib/kroger-client';

export async function POST() {
  const response = NextResponse.json({ success: true });
  for (const cookie of clearTokenCookies()) {
    response.headers.append('Set-Cookie', cookie);
  }
  return response;
}
