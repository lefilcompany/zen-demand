

## Problem

The onboarding tour reappears on every login because the completion check compares the stored role with the current role, and they never match. The `useTeamRole` hook now returns simplified values (`"owner"` / `"member"`), but previously saved preferences contain old role values (`"admin"`, `"moderator"`, etc.). This means `completed?.role === role` always evaluates to `false`, causing the tour to restart.

Additionally, since the tour steps are always the same (`ADMIN_TOUR_STEPS`) regardless of role, the role-based check is unnecessary.

## Fix

**File: `src/hooks/useOnboarding.ts`**

1. Remove the role comparison from the completion check — only check `completed?.completed === true`.
2. When saving completion, store `completed: true` without the role (or keep it for informational purposes but stop using it for the gate check).
3. Remove the dependency on `role` for the initial check `useEffect`, so the status is verified as soon as the user is available (no waiting for team role to load).
4. Add a `localStorage` fallback so even if the database query fails, the tour won't re-show.

**Key change (line ~213):**
```typescript
// Before (broken):
const hasCompletedForRole = completed?.completed && completed?.role === role;

// After (fixed):
const hasCompletedOnboarding = completed?.completed === true;
```

This ensures users who already completed the tour will never see it again, regardless of role changes.

