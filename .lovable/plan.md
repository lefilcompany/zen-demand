

# Migrar Google Calendar para OAuth 2.0 do utilizador

## Resumo
Abandonar a Service Account e usar o token OAuth do proprio utilizador logado para criar eventos no Google Calendar. Isso resolve definitivamente o erro 403 ao adicionar attendees, porque o utilizador sera o organizador real do evento.

## Arquitetura

```text
Utilizador clica "Conectar Google Calendar"
       |
  supabase.auth.signInWithOAuth('google', { scopes: 'calendar.events' })
       |
  Google retorna provider_token (armazenado na sessao)
       |
Ao criar reuniao:
  session.provider_token --> Edge Function --> Google Calendar API
       |
  Evento criado no calendario do utilizador COM attendees nativos
  Participantes recebem convite oficial do Google
```

## Mudancas

### 1. Settings.tsx - Botao "Conectar Google Calendar"
Adicionar um card de integracao na pagina de configuracoes com:
- Botao "Conectar Google Calendar" que chama `supabase.auth.signInWithOAuth` com `provider: 'google'` e `scopes: 'https://www.googleapis.com/auth/calendar.events'`, alem de `queryParams: { access_type: 'offline', prompt: 'consent' }`
- Indicador visual de status (conectado/desconectado) baseado na existencia de `session.provider_token`
- Nota explicativa sobre a necessidade de conectar para agendar reunioes

### 2. Edge Function `create-calendar-event/index.ts` - Refatoracao completa
- Remover toda logica de Service Account (jose, JWT signing, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)
- Remover toda logica de .ics e Resend (generateICS, buildInviteHTML, envio de emails)
- Receber `googleAccessToken` no body do POST
- Fazer POST direto para `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1` com `Authorization: Bearer ${googleAccessToken}`
- Incluir array de `attendees` nativo no body do evento (cada email como `{ email }`)
- Manter `conferenceData.createRequest` para gerar link do Meet
- Retornar `eventId`, `eventLink`, `meetLink`

### 3. Hook `useCreateCalendarEvent.ts` - Adicionar googleAccessToken
- Alterar a interface `CreateCalendarEventInput` para incluir `googleAccessToken: string`
- Passar o token no body da invocacao da edge function

### 4. CreateDemand.tsx e CreateDemandQuickDialog.tsx - Validar provider_token
- Antes de chamar `createCalendarEvent`, obter a sessao via `supabase.auth.getSession()`
- Verificar se `session.provider_token` existe
- Se nao existir, mostrar toast de erro: "Precisa conectar o seu Google Calendar nas configuracoes antes de agendar uma reuniao" e impedir a criacao da reuniao (a demanda em si pode ser criada normalmente)
- Se existir, passar `googleAccessToken: session.provider_token` para o hook

### 5. Limpeza
- Os secrets `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY` deixam de ser necessarios na edge function (podem ser removidos futuramente)
- A dependencia `npm:jose@5` pode ser removida do import da edge function

## Detalhes tecnicos

### Body do evento enviado ao Google Calendar API:
```text
{
  summary: title,
  description: description,
  start: { dateTime: startTime, timeZone: "America/Sao_Paulo" },
  end: { dateTime: endTime, timeZone: "America/Sao_Paulo" },
  attendees: [{ email: "user1@email.com" }, { email: "user2@email.com" }],
  conferenceData: {
    createRequest: {
      requestId: crypto.randomUUID(),
      conferenceSolutionKey: { type: "hangoutsMeet" }
    }
  },
  reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] }
}
```

### Fluxo de conexao Google
O `signInWithOAuth` com scopes adicionais re-autentica o utilizador no Google pedindo permissao extra para o calendario. O `provider_token` fica disponivel na sessao enquanto valido. O `access_type: 'offline'` garante um refresh token para renovacao automatica.

## Ficheiros afetados
- `src/pages/Settings.tsx` - Novo card de integracao Google Calendar
- `supabase/functions/create-calendar-event/index.ts` - Refatoracao completa
- `src/hooks/useCreateCalendarEvent.ts` - Adicionar campo googleAccessToken
- `src/pages/CreateDemand.tsx` - Validar provider_token antes de criar reuniao
- `src/components/CreateDemandQuickDialog.tsx` - Validar provider_token antes de criar reuniao

