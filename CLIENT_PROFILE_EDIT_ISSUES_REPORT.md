# Client Profile Editing Issues - Investigation Report

## Executive Summary

Investigation of client profile editing functionality revealed several potential issues that could prevent edits from saving when users go back to edit a profile. The main problems stem from:

1. **Race conditions with debounced saves** - Many save operations use `setTimeout` delays that can be interrupted
2. **State synchronization gaps** - Local form state may not reflect store updates after initialization
3. **Missing save triggers** - Some navigation paths don't explicitly save before switching clients
4. **Store vs. active state confusion** - Two different update mechanisms that can conflict

---

## 1. How Client Updates Are Triggered

### Current Flow

**Primary Save Mechanism: `saveActiveClientState()`**
- Located in `src/lib/store.ts` (lines 452-495)
- Saves the active client's state (userProfile, bodyCompGoals, etc.) to the client object in the `clients` array
- Also syncs to database if authenticated

**Update Triggers:**
1. **Explicit saves** - User clicks "Save" button (`handleSaveAndContinue` or `handleSaveProgress` in setup page)
2. **Auto-saves** - Many state setters trigger auto-save with 100ms delay:
   - `setUserProfile()` → `setTimeout(() => saveActiveClientState(), 100)` (line 734)
   - `setBodyCompGoals()` → `setTimeout(() => saveActiveClientState(), 100)` (line 741)
   - `setDietPreferences()` → `setTimeout(() => saveActiveClientState(), 100)` (line 748)
   - `setWeeklySchedule()` → `setTimeout(() => saveActiveClientState(), 100)` (line 755)
   - Phase operations (create, update, delete) → `setTimeout(() => saveActiveClientState(), 100)`
   - Meal plan operations → immediate `saveActiveClientState()`

3. **Navigation saves** - When selecting a different client (`selectClient` line 287)
4. **Unmount saves** - Component cleanup in setup page (line 526)

### Issue: Race Conditions with setTimeout Debouncing

**Problem:**
Many save operations use `setTimeout(() => get().saveActiveClientState(), 100)` to debounce saves. However, if a user:
- Navigates away quickly (< 100ms after making changes)
- Switches clients before the timeout fires
- Closes the browser/tab before the timeout completes

The save operation may not execute, causing data loss.

**Example from `setUserProfile` (line 729-735):**
```typescript
setUserProfile: (profile) => {
  set((state) => ({
    userProfile: { ...state.userProfile, ...profile },
  }));
  // Auto-save after a brief delay to batch updates
  setTimeout(() => get().saveActiveClientState(), 100);
},
```

**Impact:** HIGH - Users making quick edits and navigating away could lose changes.

---

## 2. Save/Sync Mechanism Issues

### Database Sync Flow

**`updateClientInDb()` in `src/lib/client-sync.ts` (lines 171-229):**
- Makes PATCH request to `/api/clients/{id}`
- Handles 404 by attempting to create the client instead
- Returns null on failure (silently fails)

**`saveActiveClientState()` in `src/lib/store.ts` (lines 452-495):**
- Updates the client in the local `clients` array
- Calls `updateClientInDb()` if authenticated
- Errors are logged but don't prevent local save

### Issue: Silent Database Sync Failures

**Problem:**
When `updateClientInDb()` fails (network error, auth issue, etc.), it:
1. Logs an error to console
2. Returns `null`
3. Does NOT update the store's sync error state
4. Does NOT notify the user

**Code (client-sync.ts lines 225-228):**
```typescript
} catch (error) {
  console.error('[ClientSync] Error updating client:', error);
  return null;  // Silent failure
}
```

**Impact:** MEDIUM - Changes save locally but may not sync to database, causing data inconsistency across devices.

### Issue: No Retry Mechanism

**Problem:**
If a database sync fails, there's no retry mechanism. The data remains only in localStorage until the next manual save or sync operation.

**Impact:** MEDIUM - Temporary network issues can cause permanent data loss if localStorage is cleared.

---

## 3. Store and Persistence Issues

### State Initialization Problem

**Setup Page (`src/app/setup/page.tsx` lines 546-551):**
```typescript
const hasInitializedFromStore = useRef(false);

useEffect(() => {
  if (isHydrated && !hasInitializedFromStore.current) {
    hasInitializedFromStore.current = true;
    // Initialize local state from store (ONLY ONCE)
    setName(userProfile.name || activeClient?.name || '');
    // ... rest of initialization
  }
}, [isHydrated]);
```

**Problem:**
The setup page initializes local form state from the store **only once** on mount. If:
- The store updates after initialization (e.g., from a database sync)
- The user navigates away and comes back
- Another component updates the store

The local form state will be **stale** and won't reflect the latest store data. When the user saves, they may overwrite newer data with old form state.

**Impact:** HIGH - Users editing a profile that was updated elsewhere could lose those updates.

### Issue: selectClient Doesn't Wait for Save

**`selectClient()` in `src/lib/store.ts` (lines 282-360):**
```typescript
selectClient: (clientId) => {
  const state = get();
  
  // First, save current client state if there's an active client
  if (state.activeClientId) {
    state.saveActiveClientState();  // Synchronous call
  }
  
  // Immediately load the new client
  const client = state.clients.find(c => c.id === clientId);
  // ... load client data
}
```

**Problem:**
`saveActiveClientState()` is called synchronously, but it:
1. Updates the store synchronously (good)
2. Triggers async database sync (may not complete)
3. Doesn't wait for completion before switching clients

If the user switches clients very quickly, the previous client's save might not complete before the new client is loaded.

**Impact:** MEDIUM - Rapid client switching could cause data loss.

### Issue: Two Update Mechanisms

**Two ways to update client data:**

1. **`updateClient(clientId, updates)`** (line 378-395)
   - Updates the client object directly in the `clients` array
   - Triggers database sync
   - Used by settings page for linking Cronometer clients

2. **`saveActiveClientState()`** (line 452-495)
   - Saves active client state to the client object
   - Used by setup page and most editing flows

**Problem:**
If a component calls `updateClient()` directly instead of updating active state and calling `saveActiveClientState()`, the changes might:
- Not be reflected in the active client state
- Cause inconsistencies between active state and client object
- Be overwritten when `saveActiveClientState()` is called later

**Example from settings page (line 72-75):**
```typescript
updateClient(fitomicsClientId, {
  cronometerClientId: cronometerClient.client_id,
  cronometerClientName: cronometerClient.name,
});
```

This bypasses the active client state entirely.

**Impact:** MEDIUM - Can cause data inconsistencies if both mechanisms are used for the same client.

### Issue: beforeunload Handler Limitations

**Setup page (lines 509-529):**
```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    if (activeClientId) {
      saveActiveClientState();  // Synchronous call
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  // ...
}, [activeClientId, saveActiveClientState]);
```

**Problem:**
The `beforeunload` event handler calls `saveActiveClientState()` synchronously, but:
1. The database sync is async and may not complete before page unloads
2. Modern browsers limit what can be done in `beforeunload` handlers
3. The handler may not fire in all navigation scenarios (SPA routing)

**Impact:** MEDIUM - Browser close/refresh might not save changes to database.

---

## 4. Specific Scenarios Where Edits Might Not Save

### Scenario 1: Quick Edit and Navigate Away
1. User edits profile field (e.g., changes name)
2. `setUserProfile()` is called → triggers `setTimeout(() => saveActiveClientState(), 100)`
3. User navigates to another page within 100ms
4. **Result:** Save timeout is cancelled, changes lost

### Scenario 2: Edit, Switch Client, Edit Again
1. User edits Client A's profile
2. User switches to Client B before save completes
3. `selectClient()` saves Client A synchronously (local only)
4. Database sync for Client A may not complete
5. User edits Client B
6. **Result:** Client A's changes may not be in database

### Scenario 3: Store Updates After Form Initialization
1. User opens Client A's profile (form initializes from store)
2. Database sync completes, updating store with newer data
3. User makes edits (based on old form state)
4. User saves
5. **Result:** Newer database data is overwritten with old form state

### Scenario 4: Direct updateClient() Call
1. Settings page calls `updateClient()` directly (bypasses active state)
2. User then edits profile in setup page
3. User saves via `saveActiveClientState()`
4. **Result:** Settings page changes might be overwritten

---

## Recommendations

### Priority 1: Fix Race Conditions

1. **Remove setTimeout debouncing for critical saves**
   - Make `saveActiveClientState()` synchronous for store updates
   - Queue database syncs separately (don't block on them)
   - Use a proper debounce utility with cancellation tracking

2. **Add explicit save before navigation**
   - Ensure `selectClient()` waits for save completion (or at least store update)
   - Add save on route change in Next.js router

3. **Improve beforeunload handling**
   - Use `navigator.sendBeacon()` for database syncs on page unload
   - Or use `visibilitychange` event for better reliability

### Priority 2: Fix State Synchronization

1. **Re-initialize form state when activeClientId changes**
   - Remove the "only once" restriction in setup page
   - Re-initialize when `activeClientId` changes, not just on mount

2. **Add store subscription for active client updates**
   - Watch for store updates to active client
   - Optionally warn user if data changed while editing

### Priority 3: Improve Error Handling

1. **Surface sync errors to users**
   - Update `syncError` state when database sync fails
   - Show toast/alert when sync fails
   - Provide retry mechanism

2. **Add retry logic for failed syncs**
   - Queue failed syncs
   - Retry on next save or on reconnect

### Priority 4: Consolidate Update Mechanisms

1. **Standardize on saveActiveClientState()**
   - Make `updateClient()` update active state first, then save
   - Or deprecate direct `updateClient()` calls for active client

2. **Add validation before save**
   - Check if active state differs from client object
   - Warn if overwriting newer data

---

## Files Requiring Changes

1. **`src/lib/store.ts`**
   - Remove setTimeout debouncing from state setters
   - Make `selectClient()` wait for save completion
   - Add sync error state updates

2. **`src/lib/client-sync.ts`**
   - Add retry mechanism
   - Return error details instead of null
   - Add sync queue for failed operations

3. **`src/app/setup/page.tsx`**
   - Re-initialize form state when activeClientId changes
   - Add store subscription for active client updates
   - Improve beforeunload handling

4. **`src/app/settings/page.tsx`**
   - Use `saveActiveClientState()` instead of direct `updateClient()` for active client

---

## Testing Recommendations

1. **Test rapid navigation** - Edit profile, immediately switch clients
2. **Test concurrent updates** - Update client in one tab, edit in another
3. **Test network failures** - Disable network, make edits, check localStorage
4. **Test browser close** - Make edits, close tab immediately
5. **Test database sync** - Verify changes persist across page refreshes
