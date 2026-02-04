
# Plano: Corrigir exibição de datas no gráfico de Evolução de Demandas

## Diagnóstico do Problema

O gráfico DemandTrendChart está exibindo as datas incorretamente porque a função atual `toDateOnly()` apenas extrai a porção YYYY-MM-DD da string ISO (que está em UTC), sem converter para o fuso horário local do usuário.

**Exemplo do problema:**
- Timestamp no banco: `2026-01-30 01:30:00+00` (UTC)
- `toDateOnly()` retorna: `2026-01-30`
- Mas no Brasil (UTC-3), este horário corresponde a: `2026-01-29 22:30:00` (dia 29!)

O usuário confirmou que quer usar o **horário local do dispositivo** para determinar o dia correto.

---

## Solução Proposta

Criar uma nova função `toLocalDateString()` que converte o timestamp UTC para a data local do usuário antes de extrair o dia.

### Mudanças Técnicas

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/dateUtils.ts` | Adicionar função `toLocalDateString()` que converte ISO para data local |
| `src/components/DemandTrendChart.tsx` | Usar `toLocalDateString()` em vez de `toDateOnly()` para comparações de datas |

---

### Nova Função: `toLocalDateString()`

```typescript
/**
 * Converte um timestamp ISO para string de data local (YYYY-MM-DD)
 * considerando o fuso horário do usuário.
 * Ex: "2026-01-30T01:30:00Z" no Brasil (UTC-3) -> "2026-01-29"
 */
export const toLocalDateString = (isoString: string | null | undefined): string | null => {
  if (!isoString) return null;
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
```

**Por que funciona:** `new Date(isoString)` automaticamente interpreta o timestamp em UTC e converte para o fuso local do navegador. Os métodos `getFullYear()`, `getMonth()` e `getDate()` retornam os valores no fuso local.

---

### Lógica do Gráfico Corrigida

No `DemandTrendChart.tsx`, substituir:
- `toDateOnly(d.created_at)` por `toLocalDateString(d.created_at)`
- `toDateOnly(d.updated_at)` por `toLocalDateString(d.updated_at)`

O helper `getLocalDate()` já converte para Date local, mas as comparações de string usavam `toDateOnly()` que ignora o fuso. A correção garante consistência.

---

### Detalhamento Sempre Diário

O usuário também preferiu **detalhamento sempre diário** quando possível. Vou ajustar a lógica de granularidade para manter dias em períodos de até 3 meses (90 dias) em vez do limite atual de 31 dias.

---

## Verificação

Após a implementação:
- Uma demanda criada às 23:30 UTC do dia 29/12 deve aparecer no dia 29/12 no gráfico se o usuário estiver em UTC, mas no dia 30/12 se estiver em UTC+3 (ou 29/12 às 20:30 se em UTC-3)
- Os outros gráficos também serão verificados para garantir consistência

---

## Escopo

Esta correção será aplicada ao `DemandTrendChart`. Os outros gráficos (`AdjustmentTrendChart`, `PriorityDistributionChart`, `AverageCompletionTime`, `WorkloadDistributionChart`) usam lógica similar e também devem ser atualizados para usar a mesma conversão de fuso local.
