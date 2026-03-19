

## Fix: Scroll no Painel de Criação/Edição de Etapas

### Problema

O painel lateral do formulário tem `overflow-y-auto` no div interno (linha 140), mas o container externo (linha 814) usa `hidden sm:flex` que conflita — o Tailwind `hidden` define `display: none` na base, e `sm:flex` sobrescreve para `display: flex`, mas a classe `flex` já está declarada na mesma linha. Além disso, falta `overflow-hidden` no container externo com `rounded-xl`, o que impede o clipping correto do scroll.

### Plano

**Arquivo: `src/components/KanbanStagesManager.tsx`**

1. **Adicionar `overflow-hidden`** ao container externo do painel (linha 814) para que o `rounded-xl` faça clip correto e o scroll interno funcione.

2. **Corrigir conflito `hidden sm:flex`** — a linha 816 tem `hidden sm:flex` mas a linha 814 já tem `flex flex-col`. Trocar para usar classes que não conflitem: remover `flex` duplicado da linha 814 e manter apenas `hidden sm:flex sm:flex-col`.

### Detalhes Técnicos

- Linha 814: adicionar `overflow-hidden` e reorganizar as classes flex para evitar conflito com `hidden`
- O container ficará: `pointer-events-auto bg-background border border-border rounded-xl overflow-hidden min-h-0 hidden sm:flex sm:flex-col`

