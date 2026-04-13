

## Diagnóstico

O problema é claro: a tabela `notifications` tem RLS ativado mas **não possui policy de INSERT**. Existem apenas policies de SELECT e UPDATE. Quando o `DemandChat.tsx` tenta inserir a notificação de menção via `supabase.from("notifications").insert(...)`, o RLS bloqueia silenciosamente a operação.

As notificações de status, criação de demanda, etc. funcionam porque são geradas por **triggers do banco de dados** que usam `SECURITY DEFINER` (bypassam RLS). Mas o trigger `notify_mention` nunca foi anexado à tabela `demand_interactions` — ele existe como função mas sem trigger ativo.

## Solução

Duas ações complementares para garantir robustez:

### 1. Criar o trigger no banco de dados
Anexar a função `notify_mention()` (que já existe e está correta) à tabela `demand_interactions` como trigger AFTER INSERT. Isso faz as notificações de menção serem criadas pelo banco (com `SECURITY DEFINER`), igual às de status/criação — sem depender de policies de INSERT no cliente.

```sql
CREATE TRIGGER on_mention_demand_interaction
  AFTER INSERT ON public.demand_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mention();
```

### 2. Remover inserção duplicada do frontend
No `DemandChat.tsx`, remover o bloco de `supabase.from("notifications").insert(mentionNotifications)` (linhas 248-255), já que o trigger cuidará disso. Manter apenas o FCM push e o envio de e-mail no frontend.

### Arquivos alterados
- **Migration SQL**: criar o trigger `on_mention_demand_interaction`
- **`src/components/DemandChat.tsx`**: remover insert manual de notificações de menção (linhas 247-255)

