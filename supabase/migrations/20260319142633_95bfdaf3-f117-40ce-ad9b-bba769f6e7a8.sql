-- Normalize team_members.role to team_role with safe default handling

-- Hide contract file policies for now
DROP POLICY IF EXISTS "Team owners can upload contract files" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can delete contract files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload contract files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete contract files" ON storage.objects;
DROP POLICY IF EXISTS "Team members can view contract files" ON storage.objects;

-- Drop conflicting team policies
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Team admins can delete teams" ON public.teams;

DROP POLICY IF EXISTS "Team creators can add self as owner" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team creators can add self as admin" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams with access code" ON public.team_members;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND column_name = 'role'
      AND udt_name = 'team_membership_role'
  ) THEN
    ALTER TABLE public.team_members ALTER COLUMN role DROP DEFAULT;

    ALTER TABLE public.team_members
      ALTER COLUMN role TYPE public.team_role
      USING CASE role::text
        WHEN 'owner' THEN 'admin'::public.team_role
        WHEN 'member' THEN 'requester'::public.team_role
        WHEN 'admin' THEN 'admin'::public.team_role
        WHEN 'moderator' THEN 'moderator'::public.team_role
        WHEN 'executor' THEN 'executor'::public.team_role
        ELSE 'requester'::public.team_role
      END;

    ALTER TABLE public.team_members
      ALTER COLUMN role SET DEFAULT 'requester'::public.team_role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_team_role(_user_id uuid, _team_id uuid, _role public.team_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_team_role(_user_id, _team_id, 'admin'::public.team_role)
$$;

CREATE POLICY "Team owners can delete teams"
ON public.teams
FOR DELETE
TO authenticated
USING (public.is_team_owner(auth.uid(), id));

CREATE POLICY "Team creators can add self as owner"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'::public.team_role
  AND public.is_team_creator(auth.uid(), team_id)
);

CREATE POLICY "Team owners can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_team_owner(auth.uid(), team_id)
  AND role = 'requester'::public.team_role
);

CREATE POLICY "Team owners can remove members"
ON public.team_members
FOR DELETE
TO authenticated
USING (public.is_team_owner(auth.uid(), team_id));

CREATE POLICY "Team owners can update members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.is_team_owner(auth.uid(), team_id))
WITH CHECK (public.is_team_owner(auth.uid(), team_id));

CREATE POLICY "Users can join teams with access code"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
