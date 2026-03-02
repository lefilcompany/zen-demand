

# Solucao: Enviar convites com .ics via email para os participantes

## Problema
Google Service Accounts nao podem adicionar attendees a eventos sem Domain-Wide Delegation. Os participantes nao recebem convites nem notificacoes.

## Solucao
Apos criar o evento no Google Calendar (para gerar o link do Meet), a edge function vai:
1. Gerar um arquivo `.ics` (formato iCalendar padrao) com os dados do evento + link do Meet
2. Enviar um email para cada participante via Resend (ja configurado no projeto) com o `.ics` como anexo

Isso permite que cada participante receba um email com o convite da reuniao que pode ser adicionado a qualquer calendario (Google Calendar, Outlook, Apple Calendar, etc.).

## Mudancas tecnicas

### 1. Atualizar a Edge Function `create-calendar-event/index.ts`

- Apos criar o evento e obter o Meet link, gerar uma string `.ics` (RFC 5545) contendo:
  - VEVENT com DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION (link do Meet), ORGANIZER, e ATTENDEEs
  - STATUS: CONFIRMED
  - METHOD: REQUEST
- Para cada email em `attendeeEmails`, chamar a Resend API diretamente (usando o `RESEND_API_KEY` ja disponivel como secret) enviando:
  - Assunto: "Convite: {titulo da reuniao}"
  - Corpo HTML com informacoes da reuniao (data/hora, link do Meet, participantes)
  - Arquivo `.ics` em anexo (content-type: `text/calendar; method=REQUEST`)
  - Remetente: `SoMA+ <noreply@pla.soma.lefil.com.br>` (mesmo do send-email existente)
- Retornar os dados do evento normalmente (eventId, eventLink, meetLink) + lista de emails enviados

### 2. Nenhuma mudanca no frontend

O frontend ja envia `attendeeEmails` no payload. A unica diferenca e que agora os participantes receberao email de verdade. Nenhuma alteracao de UI necessaria.

### Detalhes do .ics gerado

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SoMA+//Calendar//PT
METHOD:REQUEST
BEGIN:VEVENT
UID:{eventId}@soma.lefil.com.br
DTSTART:{startTime em formato UTC}
DTEND:{endTime em formato UTC}
SUMMARY:{titulo}
DESCRIPTION:{descricao + link do Meet}
LOCATION:{meetLink}
STATUS:CONFIRMED
ORGANIZER;CN=SoMA+:mailto:noreply@pla.soma.lefil.com.br
ATTENDEE;RSVP=TRUE;CN={email}:mailto:{email}
END:VEVENT
END:VCALENDAR
```

### Detalhes do email via Resend

```text
POST https://api.resend.com/emails
{
  from: "SoMA+ <noreply@pla.soma.lefil.com.br>",
  to: [attendeeEmail],
  subject: "Convite: {titulo}",
  html: "<html com detalhes da reuniao e botao para o Meet>",
  attachments: [{
    filename: "invite.ics",
    content: base64(icsContent),
    content_type: "text/calendar; method=REQUEST"
  }]
}
```

Os envios serao feitos em paralelo (Promise.all) para nao atrasar a resposta. Falhas no envio de email nao impedem a criacao do evento - apenas logam o erro e retornam quais emails falharam.

