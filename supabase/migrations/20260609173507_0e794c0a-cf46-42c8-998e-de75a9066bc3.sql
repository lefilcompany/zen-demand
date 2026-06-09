
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS default_whatsapp_board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_whatsapp_phone_unique
  ON public.profiles (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.board_whatsapp_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS board_whatsapp_keywords_keyword_unique
  ON public.board_whatsapp_keywords (lower(keyword));
CREATE INDEX IF NOT EXISTS board_whatsapp_keywords_board_idx
  ON public.board_whatsapp_keywords (board_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_whatsapp_keywords TO authenticated;
GRANT ALL ON public.board_whatsapp_keywords TO service_role;

ALTER TABLE public.board_whatsapp_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view board keywords"
  ON public.board_whatsapp_keywords FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_whatsapp_keywords.board_id
        AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Board admins/moderators manage keywords"
  ON public.board_whatsapp_keywords FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_whatsapp_keywords.board_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('admin'::team_role,'moderator'::team_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_whatsapp_keywords.board_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('admin'::team_role,'moderator'::team_role)
    )
  );

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phone text NOT NULL,
  to_phone text,
  raw_message text,
  matched_board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL,
  matched_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_demand_id uuid REFERENCES public.demands(id) ON DELETE SET NULL,
  created_request_id uuid REFERENCES public.demand_requests(id) ON DELETE SET NULL,
  ai_extraction jsonb,
  status text NOT NULL DEFAULT 'received',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_logs_phone_created_idx
  ON public.whatsapp_inbound_logs (from_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_inbound_logs_created_idx
  ON public.whatsapp_inbound_logs (created_at DESC);

GRANT SELECT ON public.whatsapp_inbound_logs TO authenticated;
GRANT ALL ON public.whatsapp_inbound_logs TO service_role;

ALTER TABLE public.whatsapp_inbound_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins view whatsapp logs"
  ON public.whatsapp_inbound_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.whatsapp_phone_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_phone_codes_user_idx
  ON public.whatsapp_phone_codes (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_phone_codes TO authenticated;
GRANT ALL ON public.whatsapp_phone_codes TO service_role;

ALTER TABLE public.whatsapp_phone_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own phone codes"
  ON public.whatsapp_phone_codes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
