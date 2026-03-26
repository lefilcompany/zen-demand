

## Problem

When a team owner views join requests, the requester's name/email/avatar shows as "Usuário" because:
1. The hook fetches profiles in a **separate query** (`supabase.from("profiles").select(...)`)
2. The `profiles` RLS policy only allows viewing profiles of users in `team_members` or `board_members`
3. A join requester is **not yet** a team member, so RLS blocks their profile — returning empty data

## Solution

Create a **security definer database function** that bypasses RLS to fetch requester profiles for team owners. This is the correct approach since the team owner has a legitimate need to see who is requesting to join.

### Step 1: Database migration — create RPC function

```sql
CREATE OR REPLACE FUNCTION public.get_join_request_profiles(request_team_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.email
  FROM profiles p
  INNER JOIN team_join_requests tjr ON tjr.user_id = p.id
  WHERE tjr.team_id = request_team_id
    AND tjr.status = 'pending'
    AND is_team_owner(auth.uid(), request_team_id)
$$;
```

This function:
- Only works if the caller is the team owner (validated inside the function)
- Only returns profiles of users with pending requests for that team
- Uses `SECURITY DEFINER` to bypass profile RLS

### Step 2: Update `src/hooks/useTeamJoinRequests.ts`

In the `useTeamJoinRequests` function, replace the separate `profiles` query with a call to the new RPC:

```ts
const { data: profiles } = await supabase
  .rpc("get_join_request_profiles", { request_team_id: teamId });
```

Everything else stays the same — the profileMap logic and the component rendering in `TeamRequests.tsx` remain unchanged.

### Technical details
- Single RPC call replaces the broken two-step fetch
- Security is enforced server-side via `is_team_owner` check inside the function
- No changes needed in the UI component (`TeamRequests.tsx`)

