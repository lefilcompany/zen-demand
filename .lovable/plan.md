

## Redesign dos indicadores de produtividade

### Conceito

A barra principal não é uma escala fixa — ela representa **onde o valor real está em relação ao benchmark ideal**. O centro da barra (50%) é o valor ideal. Se o valor real está melhor que o ideal, a barra preenche menos (para a esquerda). Se está pior, preenche mais (para a direita). Assim o usuário entende visualmente se está acima ou abaixo do esperado.

### Como funciona

**Tempo médio de conclusão** (menor = melhor):
- Benchmark ideal: calculado como mediana das demandas entregues, ou 5 dias se não houver dados suficientes
- Centro da barra (50%) = benchmark ideal
- Se `avgDays` < benchmark → barra preenche menos que 50% (bom, mais para a esquerda)
- Se `avgDays` > benchmark → barra preenche mais que 50% (ruim, mais para a direita)
- Escala: 0 a 2× o benchmark (ex: benchmark 5 dias → escala 0–10 dias)

**Tempo em atividade** (maior = melhor):
- Benchmark ideal: calculado como média de horas por membro, ou 8h se não houver dados
- Centro da barra (50%) = benchmark ideal
- Se `avgHoursPerUser` > benchmark → barra preenche mais que 50% (bom)
- Se `avgHoursPerUser` < benchmark → barra preenche menos que 50% (ruim)
- Escala: 0 a 2× o benchmark

**Barra indicadora de saúde (pequena, abaixo)**:
- Preenchida 100% com cor baseada no desvio:
  - **Verde**: dentro de ±20% do ideal
  - **Amarelo**: entre 20%–50% de desvio
  - **Vermelho**: >50% de desvio
- Label textual: "Acima da média", "Na média", "Abaixo da média"

**Badge**: muda de cor conforme o status (verde/amarelo/vermelho) e mostra o benchmark ideal como referência.

### Alterações técnicas

**Arquivo: `src/components/ProductivitySection.tsx`**

1. Remover `ProgressBarWithMarker`
2. Criar `MainProgressBar` — barra com preenchimento laranja proporcional à posição do valor real na escala (0 a 2×benchmark), onde 50% = ideal
3. Criar `HealthIndicatorBar` — barra fina (h-1.5) 100% preenchida com verde/amarelo/vermelho
4. Adicionar função `getHealthStatus(value, benchmark, lowerIsBetter)` retornando `{ color, label, bgClass }`
5. Calcular benchmarks dinamicamente a partir dos dados do quadro
6. Atualizar labels da escala para mostrar "0" à esquerda e "2× ideal" à direita, com marcador central "ideal"
7. Badge mostra "Média ideal: X dias" com cor do status

