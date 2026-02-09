
-- Tabela de API Keys para autenticação externa
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{"demands.read": true, "demands.write": true, "boards.read": true, "statuses.read": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_api_keys_team_id ON public.api_keys(team_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can manage API keys"
  ON public.api_keys
  FOR ALL
  USING (public.is_team_admin(auth.uid(), team_id));

-- Tabela de Webhook Subscriptions
CREATE TABLE public.webhook_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_webhook_subscriptions_team_id ON public.webhook_subscriptions(team_id);
CREATE INDEX idx_webhook_subscriptions_is_active ON public.webhook_subscriptions(is_active);

-- RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can manage webhook subscriptions"
  ON public.webhook_subscriptions
  FOR ALL
  USING (public.is_team_admin(auth.uid(), team_id));

-- Tabela de Webhook Logs para auditoria
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_subscription_id ON public.webhook_logs(subscription_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_subscriptions ws
      WHERE ws.id = webhook_logs.subscription_id
      AND public.is_team_admin(auth.uid(), ws.team_id)
    )
  );

-- Tabela de API Logs
CREATE TABLE public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_logs_api_key_id ON public.api_logs(api_key_id);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at DESC);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view API logs"
  ON public.api_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys ak
      WHERE ak.id = api_logs.api_key_id
      AND public.is_team_admin(auth.uid(), ak.team_id)
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
