DROP POLICY IF EXISTS "Board executors can view team requests" ON public.demand_requests;

CREATE POLICY "Board members can view requests for their boards"
ON public.demand_requests
FOR SELECT
USING (
  board_id IS NOT NULL
  AND public.is_board_member(auth.uid(), board_id)
);