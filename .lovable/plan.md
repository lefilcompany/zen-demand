

## Corrigir cálculo da "Média esperada" no card de Tempo em Atividade

### Problema
A badge "Média esperada" exibe o mesmo valor do total de horas (`totalActiveHours`), pois o código simplesmente repete a variável. Não há cálculo de média real.

### Solução
Usar `stats.avgTimePerUser` (que já existe no hook `useBoardTimeStats` e calcula `totalTimeSeconds / número de usuários`) para exibir a média real de horas por membro do quadro.

### Mudanças

**`src/components/ProductivitySection.tsx`**
- Criar variável `avgActiveHoursPerUser` a partir de `stats.avgTimePerUser` (converter de segundos para horas)
- Na badge "Média esperada", substituir `totalActiveHours` por `avgActiveHoursPerUser`
- Manter o valor principal (`totalActiveHours`) como o total acumulado do quadro
- Fazer o mesmo ajuste no card de "Tempo médio de conclusão": a badge deve mostrar a média real calculada (que já é `avgDays`), sem mudança necessária ali — já está correto

O resultado: o card mostrará o total de horas de atividade como valor principal e a média por usuário na badge.

