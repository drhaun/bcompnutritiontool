/**
 * DEBUG: Instructions to check localStorage
 * Since we can't access localStorage from the server, this provides instructions
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "Run this in your browser console to see localStorage clients:",
    command: `
// Run this in browser console (F12 -> Console):
const storage = localStorage.getItem('nutrition-planning-os-storage');
if (storage) {
  const data = JSON.parse(storage);
  console.log('Clients in localStorage:', data.state?.clients || []);
  console.log('Total:', (data.state?.clients || []).length);
} else {
  console.log('No localStorage data found');
}
    `.trim(),
    alternativeCommand: `
// Or copy the raw storage:
copy(localStorage.getItem('nutrition-planning-os-storage'));
// Then paste the result here
    `.trim(),
  });
}
