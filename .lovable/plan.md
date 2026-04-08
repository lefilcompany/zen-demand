

## Redesign da barra de produtividade

### Problema atual
A barra atual usa o centro (50%) como "ideal" e preenche proporcionalmente. O usuário quer algo diferente:

### Nova lógica visual

```text
Barra completa (cinza de fundo):
|░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░|  ← cinza (escala 0 a max)

Preenchimento laranja (valor real):
|████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░|  ← laranja até o valor real

Linha vertical do ideal (sobreposta):
|████████████████████████░░░░░|░░░░░░░░░░░░░░░░░░|  ← linha vermelha/escura no ideal
                              ↑ ideal
```

- **Barra cinza**: fundo completo representando a escala (0 até `max`)
- **Preenchimento laranja**: preenche da esquerda até onde o valor real está na escala
- **Linha vertical sobreposta**: marca onde está o "ideal" (benchmark), para o usuário comparar visualmente se o laranja passou ou ficou aquém do ideal

### Escala
- `max` = benchmark × 2 (para dar espaço visual dos dois lados)
- Se o valor real ultrapassar o max, limita em 100%

### O que muda no código

**Arquivo: `src/components/ProductivitySection.tsx`**

1. **`MainProgressBar`** — recebe `value`, `benchmark`, `maxScale`:
   - Barra cinza de fundo (já existe)
   - Preenchimento laranja: `width = (value / maxScale) * 100%`
   - **Nova linha vertical** na posição do ideal: `left = (benchmark / maxScale) * 100%`, com cor escura/vermelha (2px de largura), altura total da barra, z-index acima do laranja

2. **`HealthIndicatorBar`** — sem mudança (continua verde/amarelo/vermelho)

3. **Labels da escala** — sem mudança conceitual, já mostram 0 e 2×benchmark

Mudança é apenas no componente `MainProgressBar` — trocar o marker central fixo em 50% por um marker posicionado em `(benchmark / maxScale) * 100%` e garantir que o preenchimento laranja represente o valor real absoluto na escala.

