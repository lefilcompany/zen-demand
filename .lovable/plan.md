

## Redesign do gráfico "Tempo médio de conclusão"

### Resumo

Redesenhar o card de "Tempo médio de conclusão" no `ProductivitySection.tsx` com nova lógica de escala, barra de progresso e marcador de tempo esperado baseado em média ponderada por prioridade.

### Alterações

**1. `src/hooks/useDemands.ts`**
- Alterar o select de services de `services(id, name)` para `services(id, name, estimated_hours)`

**2. `src/components/ProductivitySection.tsx`**

- Atualizar interface `Demand` para incluir `priority`, `service_id` e `services?: { estimated_hours: number } | null`
- Novo cálculo do **tempo médio esperado** (média ponderada):
  - Pesos: `alta = 3`, `média = 2`, `baixa = 1`
  - Fórmula: `Σ(estimated_hours × peso) / Σ(peso)`
  - **Conversão para dias úteis: dividir por 8** (jornada de trabalho padrão de 8h/dia)
- Redesenhar `MainProgressBar` do card de conclusão:
  - **Escala cinza**: de `1 dia` até `Math.floor(avgDays) + 4` dias
  - **Barra laranja**: preenchida proporcionalmente até `avgDays`
  - **Marcador vertical**: posicionado no `expectedAvgDays`, com label acima mostrando o valor (ex: "6 dias"), cor de destaque `bg-slate-800 dark:bg-white`

### Detalhe importante sobre conversão

O tempo médio de conclusão real continua usando `/24` (tempo corrido entre criação e entrega). O **tempo médio esperado** (benchmark) usa `/8` porque as `estimated_hours` dos serviços representam horas úteis de trabalho em um contexto empresarial com carga horária de 8h/dia.

### Resultado visual esperado

```text
  Tempo médio de conclusão
  ┌──────────────────────────────┐
  │         4,4 dias             │
  └──────────────────────────────┘
        Tempo médio esperado:
             2,0 dias
  ████████████████│░░░░░░░░░░░░░░
  1 dia          ▲           8 dias
           marcador (/8h)
```

