
# Demandas Recorrentes (Automacao de Repeticao)

## Resumo
Adicionar a possibilidade de configurar demandas recorrentes na criacao de demandas. O usuario podera definir que uma demanda se repita diariamente, semanalmente ou mensalmente, com data de inicio e fim opcional.

## Como vai funcionar

1. Na tela de criacao de demandas, um novo campo "Recorrencia" aparece com opcoes: Nenhuma, Diaria, Semanal, Mensal
2. Ao selecionar uma recorrencia, campos adicionais aparecem: data de inicio e data de fim (opcional)
3. Para semanal: selecionar dias da semana
4. Uma Edge Function executada via cron cria automaticamente as demandas nos dias corretos

---

## Detalhes Tecnicos

### 1. Nova tabela `recurring_demands`

```sql
CREATE TABLE public.recurring_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  board_id UUID NOT NULL REFERENCES boards(id),
  created_by UUID NOT NULL,
  
  -- Template da demanda
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'media',
  status_id UUID NOT NULL,
  service_id UUID,
  assignee_ids UUID[] DEFAULT '{}',
  
  -- Configuracao de recorrencia
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  weekdays INTEGER[] DEFAULT '{}',  -- 0=Dom, 1=Seg... (usado para weekly)
  day_of_month INTEGER,             -- 1-28 (usado para monthly)
  start_date DATE NOT NULL,
  end_date DATE,                    -- NULL = sem fim
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_run_date DATE NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Com RLS policies para que membros do board possam gerenciar suas recorrencias.

### 2. Edge Function `process-recurring-demands`

Nova Edge Function que:
- Roda via cron (a cada hora, junto com check-deadlines, ou separadamente)
- Busca todas as `recurring_demands` ativas onde `next_run_date <= hoje`
- Para cada uma, cria a demanda na tabela `demands` com os dados do template
- Atualiza `next_run_date` e `last_generated_at`
- Respeita `end_date` (desativa se passou)
- Adiciona assignees se configurados

### 3. Alteracoes no Frontend

**`src/pages/CreateDemand.tsx`**:
- Novo toggle/secao "Repetir demanda" com switch
- Ao ativar, mostra:
  - Select de frequencia (Diaria, Semanal, Mensal)
  - Para Semanal: checkboxes dos dias da semana
  - Para Mensal: select do dia do mes (1-28)
  - Data de inicio (obrigatorio)
  - Data de fim (opcional)
- No submit, se recorrencia ativa:
  - Cria a demanda normalmente (primeira ocorrencia)
  - Insere registro em `recurring_demands` com os dados

**`src/components/CreateDemandQuickDialog.tsx`**:
- Versao simplificada: apenas toggle de recorrencia com frequencia basica

**Novo componente `src/components/RecurrenceConfig.tsx`**:
- Componente reutilizavel com toda a UI de configuracao de recorrencia
- Inclui os selects de frequencia, dias, datas

**Novo hook `src/hooks/useRecurringDemands.ts`**:
- CRUD para `recurring_demands`
- Query para listar recorrencias ativas do board

### 4. Cron Job

Adicionar um cron job (via pg_cron) que chama `process-recurring-demands` diariamente as 06:00 (horario de Brasilia).

### 5. Arquivos que serao criados/modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL (nova tabela + RLS + cron) | Criar |
| `supabase/functions/process-recurring-demands/index.ts` | Criar |
| `src/components/RecurrenceConfig.tsx` | Criar |
| `src/hooks/useRecurringDemands.ts` | Criar |
| `src/pages/CreateDemand.tsx` | Modificar (adicionar secao de recorrencia) |
| `src/components/CreateDemandQuickDialog.tsx` | Modificar (adicionar toggle simples) |
| `src/hooks/useDemands.ts` | Modificar (salvar recorrencia apos criar demanda) |
