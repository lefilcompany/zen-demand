
# API de Webhooks e Integracoes

## Objetivo
Criar uma API REST publica autenticada por API Keys que permite sistemas externos (como n8n, Zapier, ou sistemas internos dos clientes) receberem e enviarem dados para o SoMA+.

## Arquitetura

### 1. Tabela de API Keys
Criar uma tabela `api_keys` para gerenciar chaves de acesso por equipe:
- `id`, `team_id`, `name` (descricao da chave), `key_hash` (hash SHA-256 da chave), `key_prefix` (primeiros 8 chars para identificacao)
- `permissions` (JSONB - quais endpoints a chave pode acessar)
- `is_active`, `last_used_at`, `expires_at`, `created_by`, `created_at`
- RLS policies para que apenas admins da equipe possam gerenciar chaves

### 2. Edge Function: `public-api`
Uma unica Edge Function que roteia por path e metodo HTTP:

**Endpoints disponiveis:**

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | `/demands` | Listar demandas da equipe |
| GET | `/demands/:id` | Detalhes de uma demanda |
| POST | `/demands` | Criar nova demanda |
| PATCH | `/demands/:id/status` | Atualizar status |
| GET | `/boards` | Listar quadros |
| GET | `/statuses` | Listar status disponiveis |
| POST | `/webhooks/test` | Testar conectividade |

**Autenticacao:** Header `X-API-Key: sk_xxxxx`
A funcao valida o hash da chave contra a tabela `api_keys`.

### 3. Tabela de Webhook Subscriptions
Tabela `webhook_subscriptions` para enviar eventos para URLs externas:
- `id`, `team_id`, `url`, `events` (array de eventos como `demand.created`, `demand.status_changed`)
- `secret` (para assinatura HMAC dos payloads)
- `is_active`, `last_triggered_at`

### 4. Pagina de Gerenciamento
Tela em `/settings` (ou nova rota `/api-settings`) onde admins podem:
- Gerar/revogar API Keys
- Configurar URLs de webhook
- Ver logs de chamadas recentes
- Copiar exemplos de uso (cURL, JavaScript)

## Detalhes Tecnicos

### Geracao de API Key
```text
Formato: sk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Armazenamento: apenas o hash SHA-256 no banco
Exibicao: mostrada apenas uma vez ao criar
```

### Payload de Webhook (exemplo)
```text
POST -> URL do cliente
Headers:
  Content-Type: application/json
  X-Webhook-Signature: sha256=HMAC_HASH
Body:
  {
    "event": "demand.status_changed",
    "timestamp": "2026-02-09T...",
    "data": { demanda completa }
  }
```

### Disparo de Webhooks
Triggers no banco detectam eventos (demanda criada, status alterado) e chamam uma Edge Function `dispatch-webhook` que envia o payload para as URLs cadastradas.

### Seguranca
- API Keys hasheadas (nunca armazenadas em texto plano)
- Rate limiting por chave (via contador na tabela)
- Permissoes granulares por chave
- Assinatura HMAC nos webhooks para validacao pelo cliente
- Verificacao de plano: apenas equipes com `features.api = true` podem usar

### Arquivos a criar/editar

**Novos:**
- `supabase/functions/public-api/index.ts` - Edge Function principal da API
- `supabase/functions/dispatch-webhook/index.ts` - Disparo de webhooks
- `src/pages/ApiSettings.tsx` - Pagina de gerenciamento
- `src/hooks/useApiKeys.ts` - Hook para gerenciar API keys
- `src/hooks/useWebhookSubscriptions.ts` - Hook para gerenciar webhooks
- `src/components/api/ApiKeyManager.tsx` - Componente de gerenciamento de chaves
- `src/components/api/WebhookManager.tsx` - Componente de gerenciamento de webhooks
- `src/components/api/ApiDocsPanel.tsx` - Documentacao inline da API

**Editados:**
- `src/App.tsx` - Adicionar rota `/api-settings`
- `src/components/AppSidebar.tsx` - Adicionar link no menu
- Migracao SQL para criar tabelas `api_keys` e `webhook_subscriptions`
