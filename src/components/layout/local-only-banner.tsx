'use client';

import { isLocalOnly } from '@/lib/supabase';

export function LocalOnlyBanner() {
  if (!isLocalOnly) return null;

  return (
    <div className="w-full bg-[#e4ac61] text-[#00263d] text-sm py-2 px-4 text-center">
      Local-only mode enabled: data will stay in your browser (no Supabase).
    </div>
  );
}
