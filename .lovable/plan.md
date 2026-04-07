

## Problem

When an authenticated user opens a shared demand link (`/shared/:token`), they see the public read-only view instead of being redirected to the internal demand detail page. This happens because:

1. The current redirect logic relies on `boards` from `BoardContext`, which only loads boards for the **currently selected team**
2. If the demand belongs to a different team, or team/board data hasn't loaded yet, the check `boards.some(b => b.id === demand.board_id)` fails silently

## Solution

Replace the indirect board-context check with a **direct database query** to `board_members` to verify if the authenticated user is a member of the demand's board. This is independent of the selected team context and works reliably.

## Changes

### 1. `src/pages/SharedDemand.tsx`

- Remove the dependency on `useSelectedBoardSafe()` for the redirect logic
- Add a direct query: when `session?.user` exists and `demand` is loaded, query `board_members` to check if the user belongs to `demand.board_id`
- If the user is a board member:
  - Update `selectedTeamId` (via TeamContext) to the demand's `team_id`
  - Update `selectedBoardId` (via BoardContext) to the demand's `board_id`
  - Redirect to `/demands/${demand.id}` with `replace: true`
- Show a brief loading state during the membership check to avoid flashing the public view
- Keep the current public view as fallback for non-members and anonymous users

### Technical approach

```tsx
// Direct membership check, independent of selected team
useEffect(() => {
  if (redirectedRef.current || !demand?.id || !demand?.board_id || !session?.user) return;
  
  const checkMembership = async () => {
    const { data } = await supabase
      .from("board_members")
      .select("id")
      .eq("board_id", demand.board_id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    
    if (data) {
      redirectedRef.current = true;
      // Sync team and board context before navigating
      setSelectedTeamId(demand.team_id);
      setSelectedBoardId(demand.board_id);
      navigate(`/demands/${demand.id}`, { replace: true });
    } else {
      setMembershipChecked(true); // show public view
    }
  };
  
  checkMembership();
}, [demand, session]);
```

- A `membershipChecked` state prevents the public view from flashing before the check completes
- The loading spinner is shown while the check runs for authenticated users

