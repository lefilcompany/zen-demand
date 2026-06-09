# Integração WhatsApp → @soma cria demanda

Permitir que usuários, ao escreverem `@soma` em uma conversa de WhatsApp Business conectada, criem demandas automaticamente no SoMA. A mensagem é interpretada por IA para extrair título, descrição, prazo, responsável e quadro de destino.

## Fluxo

```text
WhatsApp Business (Sinch)
        │  webhook (mensagem recebida)
        ▼
Edge Function: whatsapp-webhook
        │  1. valida assinatura Sinch
        │  2. detecta menção "@soma"
        │  3. resolve remetente (telefone → profile)
        │  4. chama IA p/ extrair título/descrição/quadro/prazo
        ▼
   ┌────┴─────┐
   │          │
Cadastrado  Desconhecido
   │          │
   ▼          ▼
 demands   demand_requests
(direta)   (vira solicitação p/ aprovação)
   │          │
   ▼          ▼
WhatsApp: resposta de confirmação ("✅ Demanda #1234 criada no quadro Marketing")
```

## Etapas

### 1. Conectar WhatsApp Business via Sinch
- Usar `standard_connectors--connect` com o conector WhatsApp Business (Sinch).
- Usuário precisará ter número WhatsApp Business verificado já provisionado na Sinch.

### 2. Cadastro de telefone no perfil
- Adicionar coluna `whatsapp_phone` (E.164) em `profiles`, com índice único.
- UI em **Profile**: campo "WhatsApp" + botão "Verificar" (envia código de 6 dígitos via Sinch, valida, marca `whatsapp_verified_at`).
- Sem telefone verificado = usuário cai no fluxo "desconhecido".

### 3. Mapeamento quadro por palavra-chave
- Nova tabela `board_whatsapp_keywords` (board_id, keyword, created_by).
- Tela em **Configurações do Quadro → WhatsApp**: lista de palavras-chave (ex.: `#marketing`, `#dev`).
- Sintaxe aceita: `@soma #marketing <texto livre>`. Se nenhuma keyword for encontrada, usa o "quadro padrão WhatsApp" do usuário (novo campo em `profiles.default_whatsapp_board_id`).

### 4. Edge function `whatsapp-webhook`
- Endpoint público (sem JWT) que a Sinch chama.
- Valida assinatura HMAC do payload Sinch.
- Filtra mensagens que contenham `@soma` (case-insensitive, regex de palavra).
- Normaliza telefone do remetente e busca em `profiles.whatsapp_phone`.
- Extrai `#keyword` e resolve `board_id`.
- Chama Lovable AI (`google/gemini-3-flash-preview`) com `Output.object` (zod) para extrair:
  - `title` (≤ 120 chars)
  - `description` (markdown opcional)
  - `due_date` (ISO, opcional)
  - `assignee_hint` (nome/menção, opcional)
- Resolve `assignee_hint` → `user_id` consultando membros do quadro (match por nome).
- **Híbrido**:
  - Cadastrado + membro do quadro → `INSERT demands` direto (status inicial padrão, criador = profile do remetente).
  - Não cadastrado **ou** sem permissão no quadro → `INSERT demand_requests` (vira solicitação para aprovação interna).
- Anexa mídia: se a mensagem tiver imagem/áudio/documento, baixa pela API Sinch e faz upload para storage, criando `demand_attachments`.

### 5. Resposta no WhatsApp
- Após criar, edge envia mensagem de confirmação pela Sinch:
  - Sucesso direto: `✅ Demanda #SEQ criada no quadro <nome>. Ver: <link>`
  - Solicitação: `📥 Solicitação registrada. Aguardando aprovação do quadro <nome>.`
  - Erro (sem keyword + sem quadro padrão): `⚠️ Não identifiquei o quadro. Use #palavra-chave ou configure um quadro padrão no seu perfil.`

### 6. Logs e auditoria
- Nova tabela `whatsapp_inbound_logs` (from_phone, raw_message, matched_board_id, created_demand_id, created_request_id, ai_extraction jsonb, status, error, created_at) com RLS restrita a admins do sistema.

### 7. Segurança
- Webhook valida assinatura Sinch (secret `SINCH_WEBHOOK_SECRET`).
- Rate limit por telefone (máx. 10 demandas/hora) usando contagem em `whatsapp_inbound_logs`.
- Telefones desconhecidos só geram `demand_request`, nunca demanda direta — evita spam.
- Quadro precisa estar com "WhatsApp habilitado" (flag `boards.whatsapp_enabled`).

## Detalhes técnicos

**Schema novo:**
```sql
ALTER TABLE profiles
  ADD COLUMN whatsapp_phone text UNIQUE,
  ADD COLUMN whatsapp_verified_at timestamptz,
  ADD COLUMN default_whatsapp_board_id uuid REFERENCES boards(id);

ALTER TABLE boards
  ADD COLUMN whatsapp_enabled boolean DEFAULT false;

CREATE TABLE board_whatsapp_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (keyword)
);

CREATE TABLE whatsapp_inbound_logs (...);
```
Cada tabela com GRANTs + RLS conforme padrão do projeto.

**Edge functions novas (config.toml com `verify_jwt = false` no webhook):**
- `whatsapp-webhook` — recebe Sinch.
- `whatsapp-verify-phone` — envia/valida código OTP.
- `whatsapp-send-reply` — utilitário interno (chamado pelo webhook).

**Conector e secrets:**
- Conectar **WhatsApp Business via Sinch** (gateway Lovable).
- Secrets: `SINCH_WEBHOOK_SECRET` (assinatura do webhook — adicionar via `add_secret`).
- `LOVABLE_API_KEY` já existe (IA).

**Frontend novo:**
- `src/pages/Profile.tsx`: seção "WhatsApp" (telefone + verificação + quadro padrão).
- `src/pages/BoardDetail.tsx` (ou config do quadro): aba "WhatsApp" com toggle + lista de keywords.

## Pontos de atenção / limitações
- Sinch exige número Business verificado — usuário precisa providenciar antes.
- Mensagens só podem ser **respondidas** dentro da janela de 24h da última mensagem do usuário (regra do WhatsApp). Confirmações imediatas funcionam; reabrir conversa depois exige template aprovado.
- Áudios: transcrição não está incluída neste plano (fica como follow-up usando Gemini multimodal).
- Grupos do WhatsApp Business não recebem mensagens via API oficial — só conversas 1:1. Se o usuário esperava criar demanda a partir de um grupo, isso só é possível com APIs não-oficiais (não escolhidas).

## Entregáveis
1. Migration com novas colunas/tabelas + RLS + GRANTs.
2. Conector Sinch linkado + secret `SINCH_WEBHOOK_SECRET`.
3. Edge functions: `whatsapp-webhook`, `whatsapp-verify-phone`.
4. UI: seção WhatsApp no Profile e na config do Quadro.
5. Tabela de logs visível no painel admin.
