## Problema

No modal "Gerenciar Etapas do Kanban", o painel lateral "Criar Nova Etapa / Editar Etapa" não permite digitar no input, selecionar cor, abrir o select de "Tipo de Aprovação" nem rolar a área interna.

## Causa raiz

O Radix `Dialog` está configurado com `modal={true}`. Nesse modo o Radix instala uma **focus trap** + **pointer-events guard** que só libera interações para descendentes do `DialogPrimitive.Content`. O painel lateral foi propositalmente renderizado **fora** do `Content` (como um card "irmão" dentro do `DialogPortal`, para visual de dois cards lado a lado). Resultado: o focus trap bloqueia foco em inputs/select/color picker, e o guard intercepta cliques no painel — exatamente o comportamento relatado.

`onPointerDown` com `stopPropagation` não resolve porque o bloqueio acontece no nível do guard global do Radix, antes dos handlers do painel.

## Solução

1. Trocar `modal={true}` por `modal={false}` no `Dialog` raiz. O modal atualmente já implementa manualmente o que precisa:
   - Overlay próprio (`DialogOverlay` com `bg-black/60`).
   - Bloqueio de fechamento por clique fora via `onPointerDownOutside` / `onInteractOutside` (que continuam funcionando).
   - `pointer-events: none` no wrapper externo + `pointer-events-auto` nos cards — garante que cliques no overlay não interajam com a página atrás.

2. Garantir pointer-events explícitos no overlay para que ele continue capturando cliques fora dos cards, mantendo o efeito visual de modal:
   - Adicionar `pointer-events-auto` ao `DialogOverlay`.

3. Manter `autoFocus` no input "Nome da Etapa" — sem o focus trap do Radix, o `autoFocus` do `<Input>` passa a funcionar normalmente.

4. Pequena melhoria: remover o `onPointerDown={(e) => e.stopPropagation()}` do painel lateral, que deixa de ser necessário (sem focus trap, não há mais guard a evitar). O painel passa a ser um nó pointer-events-auto comum dentro do portal.

5. Verificar que `Select` (Radix), `ColorPicker` (popover/inputs) e scroll na área `overflow-y-auto` do `StageForm` voltam a funcionar tanto na visão lado-a-lado (lg+) quanto no fallback mobile.

## Detalhes técnicos

Arquivo único: `src/components/KanbanStagesManager.tsx`

```text
[Dialog modal=false]
  └─ DialogPortal
      ├─ DialogOverlay (pointer-events-auto, capta clique fora)
      └─ <div fixed inset-0 flex pointer-events-none>
           ├─ DialogPrimitive.Content (pointer-events-auto)  ← lista de etapas
           └─ <div data-stage-form-panel pointer-events-auto> ← painel lateral
                └─ <StageForm />  (Input, ColorPicker, Select, scroll OK)
```

Mudanças mínimas:

- Linha 583: `modal={true}` → `modal={false}`.
- Linha 591: adicionar `pointer-events-auto` ao `DialogOverlay`.
- Linhas 811-812 e 831-832: remover `onPointerDown`/`onMouseDown` `stopPropagation` (não mais necessários).
- Os handlers `onPointerDownOutside`/`onInteractOutside` no `Content` continuam tratando o caso de não fechar o modal quando o painel lateral / popovers Radix recebem clique.

## Validação

Após aplicar, testar no preview:
- Abrir "Etapas" → "Criar Nova Etapa": digitar nome, escolher cor (incluindo input hex), abrir Select de "Tipo de Aprovação", rolar a área do formulário.
- Editar uma etapa existente: mesmas interações.
- Clicar fora dos dois cards (no overlay escuro): NÃO deve fechar enquanto o painel está aberto; deve fechar quando só a lista está aberta.
- Mobile (lg-): o painel substitui o card principal e mantém todas as interações.
