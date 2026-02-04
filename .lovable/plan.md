
# Plano: Ajustar Notificações para Escopo por Quadro

## Análise do Sistema Atual

Após análise detalhada do sistema de notificações, identifiquei os seguintes pontos:

### ✅ Notificações que já funcionam corretamente por quadro:

1. **`notify_demand_created()`** - Já foi atualizado para notificar apenas `board_members` do quadro da demanda
2. **`notify_demand_status_changed()`** - Notifica apenas creator e assignees (pessoas diretamente relacionadas à demanda)
3. **`notify_assignee_added()`** - Notifica apenas o usuário que foi atribuído
4. **`notify_adjustment_completed()`** - Notifica apenas o creator da demanda
5. **`check-deadlines`** - Notifica apenas creator, assigned_to e assignees

### ⚠️ Notificações que precisam de ajuste:

1. **`notify_demand_request_created()`** - Notifica admins/moderators da equipe inteira quando uma solicitação de demanda é criada. Deveria notificar apenas admins/moderators que têm acesso ao quadro selecionado.

2. **Notificações de menção** - Atualmente, qualquer usuário pode ser mencionado e notificado, mesmo que não seja membro do quadro.

---

## Correções Necessárias

### 1. Atualizar `notify_demand_request_created()` (Trigger SQL)

O problema é que `demand_requests` não tem um `board_id`, apenas `team_id`. Existem duas opções:

**Opção A (Recomendada)**: Adicionar campo `board_id` à tabela `demand_requests` e atualizar o trigger para notificar apenas admins/moderators desse quadro específico.

**Opção B**: Manter o comportamento atual, já que solicitações de demanda são feitas a nível de equipe e podem ser direcionadas a qualquer quadro.

### 2. Atualizar `notify_mention()` para verificar membership do quadro

Apenas notificar usuários mencionados que são membros do quadro da demanda.

---

## Mudanças Propostas

### Migração SQL

```sql
-- 1. Adicionar board_id à tabela demand_requests (opcional)
ALTER TABLE public.demand_requests 
ADD COLUMN board_id UUID REFERENCES public.boards(id);

-- 2. Atualizar notify_demand_request_created para filtrar por board_members
CREATE OR REPLACE FUNCTION public.notify_demand_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_member RECORD;
  requester_name TEXT;
  team_name TEXT;
BEGIN
  -- Get requester name and team name
  SELECT full_name INTO requester_name FROM profiles WHERE id = NEW.created_by;
  SELECT name INTO team_name FROM teams WHERE id = NEW.team_id;
  
  -- Se tem board_id, notifica apenas admins desse quadro
  IF NEW.board_id IS NOT NULL THEN
    FOR admin_member IN 
      SELECT user_id FROM board_members 
      WHERE board_id = NEW.board_id 
      AND role IN ('admin', 'moderator')
      AND user_id != NEW.created_by
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        admin_member.user_id,
        'Nova solicitação de demanda',
        requester_name || ' solicitou a criação de uma demanda: "' || NEW.title || '"',
        'info',
        '/demand-requests'
      );
    END LOOP;
  ELSE
    -- Fallback: notifica admins da equipe
    FOR admin_member IN 
      SELECT user_id FROM team_members 
      WHERE team_id = NEW.team_id 
      AND role IN ('admin', 'moderator')
      AND user_id != NEW.created_by
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        admin_member.user_id,
        'Nova solicitação de demanda',
        requester_name || ' solicitou a criação de uma demanda: "' || NEW.title || '"',
        'info',
        '/demand-requests'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Atualizar notify_mention para verificar membership do quadro
CREATE OR REPLACE FUNCTION public.notify_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_user_id UUID;
  mention_pattern TEXT;
  demand_title TEXT;
  demand_board_id UUID;
  sanitized_pattern TEXT;
  is_board_member BOOLEAN;
BEGIN
  -- Get demand info
  SELECT title, board_id INTO demand_title, demand_board_id 
  FROM demands WHERE id = NEW.demand_id;
  
  -- Find all @mentions in content
  FOR mention_pattern IN 
    SELECT (regexp_matches(NEW.content, '@([a-zA-Z0-9_-]+)', 'g'))[1]
  LOOP
    sanitized_pattern := regexp_replace(mention_pattern, '[^a-zA-Z0-9_-]', '', 'g');
    
    IF length(sanitized_pattern) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Find user by name
    SELECT id INTO mentioned_user_id 
    FROM profiles 
    WHERE LOWER(full_name) = LOWER(sanitized_pattern)
    LIMIT 1;
    
    IF mentioned_user_id IS NULL THEN
      SELECT id INTO mentioned_user_id 
      FROM profiles 
      WHERE full_name ILIKE '%' || replace(replace(sanitized_pattern, '%', '\%'), '_', '\_') || '%'
      LIMIT 1;
    END IF;
    
    -- NOVO: Verificar se o usuário é membro do quadro
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      SELECT EXISTS(
        SELECT 1 FROM board_members 
        WHERE board_id = demand_board_id 
        AND user_id = mentioned_user_id
      ) INTO is_board_member;
      
      -- Apenas notificar se for membro do quadro
      IF is_board_member THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          mentioned_user_id,
          'Você foi mencionado',
          'Você foi mencionado em um comentário na demanda "' || left(demand_title, 100) || '"',
          'info',
          '/demands/' || NEW.demand_id
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;
```

### Atualizar Frontend (CreateDemandRequest)

Se adicionarmos `board_id` à tabela `demand_requests`, precisaremos atualizar o formulário de criação de solicitação para incluir a seleção do quadro.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Atualizar triggers de notificação |
| `src/pages/CreateDemandRequest.tsx` | Adicionar seleção de quadro (opcional) |
| `src/hooks/useDemandRequests.ts` | Incluir board_id na criação |

---

## Benefícios

1. **Menos ruído**: Usuários só recebem notificações dos quadros onde atuam
2. **Maior relevância**: Notificações são contextualizadas ao trabalho do usuário
3. **Conformidade com RLS**: Mantém consistência com as políticas de acesso por quadro
4. **Segurança**: Usuários não veem notificações de demandas que não deveriam ter acesso

---

## Considerações

- As notificações de **solicitação de entrada na equipe** (`notify_team_join_request_created`) devem continuar notificando admins da equipe, pois são sobre associação à equipe, não a quadros específicos.
- Notificações sobre **status de demanda**, **assignees** e **deadlines** já funcionam corretamente porque notificam apenas pessoas diretamente relacionadas à demanda.
