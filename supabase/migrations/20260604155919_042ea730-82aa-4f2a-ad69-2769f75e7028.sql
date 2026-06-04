DROP POLICY IF EXISTS "Anyone can view statuses" ON public.demand_statuses;

CREATE POLICY "Anyone can view system statuses"
ON public.demand_statuses
FOR SELECT
USING (board_id IS NULL);

CREATE POLICY "Board members can view custom statuses"
ON public.demand_statuses
FOR SELECT
TO authenticated
USING (board_id IS NOT NULL AND public.is_board_member(auth.uid(), board_id));