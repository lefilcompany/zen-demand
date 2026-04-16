

# Fix Kanban Drag-and-Drop Fluidity

## Problem
Moving demands between columns is laggy and causes a "snap back" effect because:
1. Before applying the optimistic update, the code makes an **async DB query** to check if the demand is a parent — this adds 200-500ms delay before the card visually moves.
2. In `onSuccess`, `await queryClient.invalidateQueries` blocks the clearing of optimistic state, causing the card to briefly snap back to its old position before jumping forward again.
3. The same blocking DB query exists in `handleMobileStatusChange`.

## Solution
Make all blocking checks synchronous (using in-memory data) and remove the `await` on query invalidation.

## Technical Changes

### File: `src/components/KanbanBoard.tsx`

**1. Remove blocking DB queries for parent check in `handleDropWithStatusId` (lines 548-562)**
Replace the async `supabase.from("demands").select(...)` call with a synchronous check using the existing `demands` array:
```typescript
const isParentDemandByDb = demands.some(d => d.parent_demand_id === demandId);
if (isParentDemandByDb) { ... return; }
```

**2. Same fix in `handleMobileStatusChange` (lines 702-715)**
Replace the async DB query with the same synchronous check.

**3. Move optimistic update BEFORE dependency check in `handleDropWithStatusId` (line 583)**
Apply `setOptimisticUpdates` immediately after the same-column guard, then roll it back if dependency check fails.

**4. Remove `await` from `queryClient.invalidateQueries` in both `onSuccess` handlers (lines 611, 779)**
Change `await queryClient.invalidateQueries(...)` to just `queryClient.invalidateQueries(...)` so optimistic state clears immediately. The query will still refetch in background.

**5. Clear optimistic state BEFORE invalidation, not after**
Move `setOptimisticUpdates` cleanup to run right when `onSuccess` fires, before the invalidation and auto-parent-status checks.

These changes eliminate all async delays from the drag-drop flow while preserving correctness.

