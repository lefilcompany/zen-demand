

## Problem

When a logged-in user opens a shared demand link (`/shared/:token`), they always see the public read-only view. If they belong to the demand's board, they should be redirected to the full internal view (`/demands/:id`) with automatic board switching. If they don't belong to the board, the public view should still work fine (which it already does).

## Solution

Modify `src/pages/SharedDemand.tsx` to detect if the current user is authenticated and belongs to the demand's board. If so, redirect them to `/demands/:demandId` (which already auto-switches board context via the existing `DemandDetail` effect).

### Changes

**`src/pages/SharedDemand.tsx`**:
- Import `useAuth` and `useSelectedBoard` (safe version)
- After the demand data loads, check if the user is logged in
- If logged in, fetch the user's board IDs and check if `demand.board_id` (obtained from the edge function response — need to include `board_id` in the shared-demand response) is in their boards
- If the user is a board member: `navigate(/demands/${demand.id}, { replace: true })` and call `setSelectedBoardId(demand.board_id)` before navigating
- If the user is NOT a board member: show the existing public view as-is (no change)

**`supabase/functions/shared-demand/index.ts`**:
- Add `board_id` to the demand select query (it's already in the `demands` table columns but not explicitly selected — need to verify and add if missing)

### Flow

```text
User opens /shared/:token
  ├─ Not logged in → public read-only view (current behavior)
  └─ Logged in
       ├─ Is board member → switch board + redirect to /demands/:id
       └─ Not board member → public read-only view
```

### Technical details
- The `useAuth` hook provides `session?.user` to check login status
- The `useSelectedBoard` hook (safe version) provides `boards` array and `setSelectedBoardId`
- Board membership check: `boards?.some(b => b.id === demand.board_id)`
- The redirect uses `replace: true` to avoid back-button loops
- The edge function already returns the demand object; just need to ensure `board_id` is in the select fields

