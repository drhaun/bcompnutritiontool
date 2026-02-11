'use client';

import { useEffect } from 'react';
import { useFitomicsStore, flushPendingSavesSync } from '@/lib/store';

/**
 * Hook that ensures any pending client state changes are saved when the user
 * navigates away from the page (via SPA navigation or browser close/refresh).
 *
 * Drop this into any page that modifies client data (phases, meal plans, etc.)
 * to prevent data loss from debounced saves that haven't fired yet.
 */
export function useSaveOnLeave() {
  const activeClientId = useFitomicsStore((s) => s.activeClientId);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush immediately before the browser navigates away / closes
      flushPendingSavesSync();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush on SPA navigation (component unmount)
      if (activeClientId) {
        flushPendingSavesSync();
      }
    };
  }, [activeClientId]);
}
