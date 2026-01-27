'use client';

/**
 * DEPRECATED: This persistence provider used separate tables.
 * Client data sync is now handled by the Zustand store with the consolidated `clients` table.
 * See: src/lib/client-sync.ts and src/lib/store.ts
 */

export function PersistenceProvider() {
  // No-op - client sync is now handled by the store
  return null;
}
