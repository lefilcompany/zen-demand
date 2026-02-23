

# Restaurar Layout Board-Style do Sistema

## Problema Identificado

O layout do sistema deveria seguir o padrao visual onde:
- O **fundo externo** (area atras do conteudo principal) tem uma cor diferente (warm/tinted)
- O **conteudo** aparece como um "board" branco arredondado com sombra por cima desse fundo
- A sidebar fica separada visualmente

Analisando o codigo atual em `ProtectedLayout.tsx`, a estrutura base ja existe (`bg-sidebar` no container externo, `bg-background rounded-xl shadow-xl` no main), porem o `bg-sidebar` usa a cor escura do sidebar (`0 0% 11%` - preto), que nao cria o contraste correto com o conteudo branco no modo claro.

Nas imagens de referencia, o fundo externo e uma cor quente/alaranjada suave, nao o preto do sidebar.

## Solucao

### 1. Criar uma nova variavel CSS para o fundo da area externa do board

No `src/index.css`, adicionar uma variavel `--board-background` que sera uma cor quente/alaranjada suave no modo claro e uma cor escura no modo dark:

- **Light mode**: Uma cor warm sutil (tipo `30 30% 95%` - um bege/peach claro) que combine com a paleta laranja
- **Dark mode**: Manter algo proximo ao sidebar escuro (`0 0% 8%`)

### 2. Atualizar o ProtectedLayout.tsx

Trocar `bg-sidebar` no container externo por uma classe que use a nova variavel, garantindo que:
- O padding ao redor do board se mantenha (`p-2 md:p-3`)
- O `rounded-xl` e `shadow-xl` do main continuem criando o efeito de board flutuante
- O header do board mantenha o `rounded-t-xl` e `border-b`

### 3. Garantir consistencia nos estados de loading

Atualizar os componentes `RequireAuth.tsx`, `RequireTeam.tsx` e o loading do `ProtectedLayout.tsx` para usar a mesma cor de fundo, mantendo a consistencia visual.

---

### Detalhes Tecnicos

**Arquivo: `src/index.css`**
- Adicionar variavel `--board-background` em `:root` com valor warm (ex: `30 25% 95%`)
- Adicionar variavel `--board-background` em `.dark` com valor escuro (ex: `0 0% 6%`)

**Arquivo: `src/components/ProtectedLayout.tsx`**
- Linha 117: Trocar `bg-sidebar` por uma classe customizada usando `bg-[hsl(var(--board-background))]`
- Manter toda a estrutura de layout existente (flex, overflow, padding)

**Arquivo: `src/components/RequireAuth.tsx`**
- Atualizar `bg-sidebar` para `bg-[hsl(var(--board-background))]`

**Arquivo: `src/components/RequireTeam.tsx`**  
- Atualizar `bg-sidebar` para `bg-[hsl(var(--board-background))]`

