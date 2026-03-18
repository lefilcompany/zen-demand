

## Problem Analysis

There are **3 distinct issues** preventing team joining:

### 1. Build/Deploy Failure (Blocking Production)
The migration `20260318133423` fails on production with: *"cannot alter type of a column used in a policy definition — policy 'Team admins can delete teams' on table teams depends on column 'role'"*. The migration tries to `DROP POLICY` before altering the column, but Postgres still sees the dependency. The fix is to make the migration more robust by using a PL/pgSQL block to dynamically find and drop all dependent policies.

### 2. Trigger Functions Use Old Enum Values
After the migration applied to test, these functions still reference `'admin'`/`'moderator'` (old `team_role` enum values) on `team_members.role`, which now uses `team_membership_role` (`'owner'`/`'member'`):
- `notify_team_join_request_created()` — `WHERE role IN ('admin', 'moderator')` → should be `WHERE role = 'owner'`
- `notify_request_comment_created()` — declares `commenter_role public.team_role` and queries `team_members.role` 
- `sync_admin_to_all_boards()` — checks `IF NEW.role = 'admin'` → should be `'owner'`
- `add_member_to_default_board()` — checks `IF NEW.role = 'admin'` → should be `'owner'`

This causes the error: `invalid input value for enum team_membership_role: "admin"` when creating a join request.

### 3. Board-Role Query Returns `undefined`
In `useBoardMembers.ts`, line 82: `return data?.role` returns `undefined` (not `null`) when `data` is `null`, violating React Query's contract.

---

## Plan

### Step 1: Fix the failing migration
Edit `supabase/migrations/20260318133423_e2ea6a28-0472-4b0c-b965-95421634eec4.sql` to wrap the policy drops in a `DO $$` block that dynamically finds and drops ALL policies on `teams` and other tables that reference `team_members.role`, ensuring no dependency remains before the column alteration.

### Step 2: New migration to fix trigger functions
Create a migration that updates all 4 trigger functions to use `'owner'` instead of `'admin'`/`'moderator'` when querying `team_members.role`:
- `notify_team_join_request_created()`: change `role IN ('admin', 'moderator')` → `role = 'owner'`
- `notify_request_comment_created()`: change variable type from `team_role` to `team_membership_role`, update role checks
- `sync_admin_to_all_boards()`: change `'admin'` → `'owner'`  
- `add_member_to_default_board()`: change `'admin'` → `'owner'`

### Step 3: Fix board-role undefined in client code
In `src/hooks/useBoardMembers.ts`, change line 82 from:
```typescript
return data?.role as BoardRole | null;
```
to:
```typescript
return (data?.role as BoardRole) ?? null;
```

This ensures `null` is returned instead of `undefined` when the user is not a board member.

