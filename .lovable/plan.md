
# Ajuste do Layout do Board - Borda inferior e profundidade

## Problema
O container principal (`main`) do board nao tem a borda inferior arredondada visivel corretamente, falta profundidade visual (sombra/depth), e o scroll precisa estar contido dentro do board.

## Solucao

### Arquivo: `src/components/ProtectedLayout.tsx`

**1. Container externo (linha 117)**
- Trocar `bg-sidebar` por `bg-[hsl(var(--board-background))]` para usar a cor de fundo correta do board
- Manter `p-2 md:p-3` para o espacamento ao redor

**2. Main board (linha 119)**
- Adicionar `shadow-2xl` em vez de `shadow-xl` para mais profundidade
- Adicionar `border border-border/50` para uma borda sutil ao redor de todo o board
- Manter `rounded-xl` e `overflow-hidden` para conter o scroll dentro

**3. Area de conteudo (linha 201)**
- Manter `overflow-y-auto` para scroll interno ao board
- O `overflow-hidden` no `main` garante que o scroll nao vaze para fora do board arredondado

### Arquivo: `src/index.css`

Verificar se a variavel `--board-background` ja existe. Se nao:
- Light: `30 25% 95%` (bege quente sutil)
- Dark: `0 0% 6%` (escuro profundo)

---

## Detalhes Tecnicos

Mudancas especificas:

**Linha 117** - Container externo:
```
bg-sidebar  -->  bg-[hsl(var(--board-background))]
```

**Linha 119** - Main board:
```
shadow-xl  -->  shadow-2xl border border-border/40
```

Isso cria o efeito de "board flutuante" com profundidade, borda inferior visivel (arredondada), e scroll totalmente contido dentro do painel branco.
