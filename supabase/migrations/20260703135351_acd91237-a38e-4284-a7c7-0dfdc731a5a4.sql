-- 1) Fix notifications INSERT: allow any authenticated user to create notifications
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2) Grant minimal column-level SELECT on profiles/teams to anon so shared/public pages
-- can render author names and team names without hitting "permission denied for table".
GRANT SELECT (id, full_name, avatar_url, email) ON public.profiles TO anon;
GRANT SELECT (id, name, description, created_at) ON public.teams TO anon;

-- 3) Add anon SELECT policy for teams referenced by shared demands/notes
DROP POLICY IF EXISTS "Anonymous can view teams for shared content" ON public.teams;
CREATE POLICY "Anonymous can view teams for shared content"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (
    id IN (
      SELECT d.team_id FROM public.demands d WHERE public.is_demand_shared(d.id)
      UNION
      SELECT n.team_id FROM public.notes n WHERE public.is_note_shared(n.id)
    )
  );