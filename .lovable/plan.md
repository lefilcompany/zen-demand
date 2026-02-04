
# Plano: Adicionar automaticamente admins da equipe a todos os quadros

## Resumo

Quando um usuário for promovido a **Administrador** da equipe, ele será automaticamente adicionado a todos os quadros existentes dessa equipe com cargo de admin. Além disso, quando um novo quadro for criado, todos os administradores da equipe serão automaticamente incluídos nele.

---

## Como Funciona Hoje

| Situação | Comportamento Atual |
|----------|---------------------|
| Membro entra na equipe | Adicionado apenas ao quadro padrão como "Solicitante" |
| Quadro novo é criado | Apenas o criador é adicionado como admin |
| Membro promovido a Admin | Nenhuma ação automática - precisa ser adicionado manualmente a cada quadro |

---

## Novo Comportamento

| Situação | Comportamento Novo |
|----------|-------------------|
| Membro promovido a Admin | Adicionado automaticamente a **todos os quadros** da equipe como Admin |
| Quadro novo é criado | **Todos os admins** da equipe são automaticamente adicionados ao quadro |
| Membro entra já como Admin | Adicionado a todos os quadros da equipe como Admin |

---

## Mudanças no Banco de Dados

### 1. Trigger: Promoção a Admin

Quando `team_members.role` é atualizado para `'admin'`, adicionar o usuário a todos os boards da equipe:

```text
┌─────────────────────────────────────────────────────────────┐
│  team_members UPDATE (role = 'admin')                       │
│                     ↓                                       │
│  Trigger: sync_admin_to_all_boards                          │
│                     ↓                                       │
│  INSERT INTO board_members (todos os boards da equipe)      │
└─────────────────────────────────────────────────────────────┘
```

### 2. Modificar: Função de criação de board

Quando um board é criado via RPC `create_board_with_services`, adicionar também todos os admins da equipe (não apenas o criador):

```text
┌─────────────────────────────────────────────────────────────┐
│  create_board_with_services() RPC                           │
│                     ↓                                       │
│  INSERT board                                               │
│                     ↓                                       │
│  INSERT criador como admin                                  │
│                     ↓                                       │
│  INSERT todos os admins da equipe como admins               │
└─────────────────────────────────────────────────────────────┘
```

### 3. Modificar: Trigger de novo membro

Quando um membro entra na equipe, verificar se é admin. Se for, adicionar a todos os boards (não apenas o default):

```text
┌─────────────────────────────────────────────────────────────┐
│  team_members INSERT                                        │
│                     ↓                                       │
│  Se role = 'admin':                                         │
│    → Adicionar a TODOS os boards como admin                 │
│  Senão:                                                     │
│    → Adicionar apenas ao board padrão como requester        │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Nova função: `sync_admin_to_all_boards()`

```sql
CREATE OR REPLACE FUNCTION public.sync_admin_to_all_boards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só executar se o role foi alterado para 'admin'
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
    -- Adicionar usuário a todos os boards da equipe como admin
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    SELECT 
      b.id,
      NEW.user_id,
      'admin'::team_role,
      NEW.user_id
    FROM public.boards b
    WHERE b.team_id = NEW.team_id
    ON CONFLICT (board_id, user_id) 
    DO UPDATE SET role = 'admin'::team_role;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### Trigger de UPDATE em team_members

```sql
CREATE TRIGGER on_team_member_role_changed
  AFTER UPDATE OF role ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_to_all_boards();
```

### Modificar: `add_member_to_default_board()`

```sql
CREATE OR REPLACE FUNCTION public.add_member_to_default_board()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    -- Admins: adicionar a TODOS os boards
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    SELECT b.id, NEW.user_id, 'admin'::team_role, NEW.user_id
    FROM public.boards b
    WHERE b.team_id = NEW.team_id
    ON CONFLICT (board_id, user_id) DO NOTHING;
  ELSE
    -- Outros: adicionar apenas ao board padrão
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    SELECT b.id, NEW.user_id, 'requester'::team_role, NEW.user_id
    FROM public.boards b
    WHERE b.team_id = NEW.team_id AND b.is_default = true
    ON CONFLICT (board_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### Modificar: `create_board_with_services()`

Adicionar lógica para incluir todos os admins da equipe no novo board:

```sql
-- Após criar o board e adicionar o criador...

-- Adicionar todos os admins da equipe ao novo board
INSERT INTO public.board_members (board_id, user_id, role, added_by)
SELECT 
  v_new_board.id,
  tm.user_id,
  'admin'::team_role,
  v_user_id
FROM public.team_members tm
WHERE tm.team_id = p_team_id 
  AND tm.role = 'admin'
  AND tm.user_id != v_user_id  -- Criador já foi adicionado
ON CONFLICT (board_id, user_id) DO NOTHING;
```

### Migração de dados existentes

Sincronizar admins atuais com boards existentes:

```sql
INSERT INTO public.board_members (board_id, user_id, role, added_by)
SELECT b.id, tm.user_id, 'admin'::team_role, tm.user_id
FROM public.team_members tm
JOIN public.boards b ON b.team_id = tm.team_id
WHERE tm.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.board_members bm 
    WHERE bm.board_id = b.id AND bm.user_id = tm.user_id
  )
ON CONFLICT (board_id, user_id) DO UPDATE SET role = 'admin'::team_role;
```

---

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Criar funções, triggers e migrar dados existentes |

---

## Verificação

Após implementação:
- Promover um membro a admin → ele aparece em todos os quadros
- Criar novo quadro → todos os admins da equipe são membros automaticamente
- Novo usuário entra como admin → adicionado a todos os quadros
