
## Problem Analysis

When a user opens the app in a new tab, the "remember me" logic in `src/lib/auth.tsx` (lines 92-158) calls `supabase.auth.signOut()` **globally** — this invalidates the session in localStorage, which triggers a `SIGNED_OUT` event on ALL other open tabs, logging the user out everywhere.

The root cause is two-fold:
1. `sessionStorage` is per-tab, so each new tab sees `sessionChecked` as missing and treats itself as a "fresh browser session"
2. `supabase.auth.signOut()` defaults to `scope: 'global'`, which revokes the session server-side and clears localStorage, affecting all tabs

## Solution

### 1. Fix the "remember me" session check (src/lib/auth.tsx)

- Change `supabase.auth.signOut()` on line 152 to use `scope: 'local'` — this only clears the session from the current tab's perspective without invalidating the refresh token server-side or affecting other tabs
- Add cross-tab synchronization via the `storage` event listener so that if one tab signs in/out intentionally, other tabs react properly
- Ensure the `onAuthStateChange` handler properly syncs state when receiving cross-tab events

### 2. Ensure intentional logout remains global (src/lib/auth.tsx)

- The explicit `signOut()` function (user clicks "Sair da Conta") should keep using the default `scope: 'global'` so it properly logs out everywhere — this is the desired behavior for intentional logout

### Changes Summary

**File: `src/lib/auth.tsx`**
- Line 152: Change `supabase.auth.signOut()` → `supabase.auth.signOut({ scope: 'local' })` so the "remember me" check doesn't kill sessions in other tabs
- Add a `window.addEventListener('storage', ...)` listener that detects when the Supabase auth key changes in localStorage (from another tab signing in) and re-syncs the session via `getSession()` — this ensures new logins in other tabs are reflected without causing logout
- On the `SIGNED_OUT` event from `onAuthStateChange`, only navigate to `/auth` if the event originated from the current tab (not a cross-tab storage sync)

This is a minimal, targeted fix that preserves the existing "remember me" behavior while allowing multiple tabs to coexist with the same authenticated session.
