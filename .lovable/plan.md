
Objetivo: refazer o fluxo do “apêndice” de etapas do Kanban para funcionar de forma robusta: scroll do mouse confiável, lista + formulário utilizáveis ao mesmo tempo, sem fechamento/acidente de foco.

1) Diagnóstico (com base no código atual)
- O problema principal está em `src/components/KanbanStagesManager.tsx`:
  - o modal principal é ocultado quando `sidePanel` abre (`sidePanel ? "hidden sm:flex..."`), então você não consegue usar os dois ao mesmo tempo.
  - o apêndice usa cadeia de `flex-1/min-h-0/overflow` sem altura fixa real, e com overflow aninhado, o que quebra o scroll do mouse em telas como 1180x718.
  - há arquitetura com dois `DialogPrimitive.Content` + wrapper `pointerEvents: none`, aumentando conflitos de foco/scroll.

2) Refatoração completa da estrutura (novo layout)
- Substituir o modelo “modal + apêndice flutuante fixo” por um único modal com 2 painéis internos:
  - Painel esquerdo: lista de etapas.
  - Painel direito: formulário (criar/editar).
- Em desktop (>= lg): dois painéis visíveis e clicáveis simultaneamente.
- Em mobile/tablet estreito: painel direito vira visão secundária (sem quebrar rolagem), mas preservando usabilidade.

3) Scroll confiável em ambos os lados
- Aplicar estrutura estável de altura:
  - container do modal com `h-[85vh] max-h-[85vh] flex min-h-0`.
  - cada coluna com `flex flex-col min-h-0`.
  - área de conteúdo de cada coluna com `flex-1 min-h-0 overflow-y-auto`.
  - rodapés/botões com `shrink-0`.
- No formulário:
  - campos roláveis em uma área única.
  - ações (“Cancelar/Salvar/Criar”) sempre visíveis no rodapé da coluna.
- Remover overflows duplicados que hoje capturam o wheel no elemento errado.

4) Comportamento de interação (usar os dois “modais” ao mesmo tempo)
- Não esconder mais a lista quando abrir criar/editar.
- Permitir:
  - editar uma etapa e clicar em outra da lista para trocar imediatamente de contexto;
  - abrir “Criar Nova Etapa” mantendo a lista acessível.
- Fechar o formulário não fecha o modal inteiro; fechar modal fecha ambos.

5) Simplificação de estado e eventos
- Eliminar `sidePanelVisible` + `setTimeout` de desmontagem (estado frágil).
- Trocar por estado único explícito (`null | create | edit`) e render condicional simples.
- Manter proteção de interação externa apenas no necessário (evitar fechar ao interagir com selects/popovers do Radix).

6) Arquivos que serão ajustados
- `src/components/KanbanStagesManager.tsx` (refatoração principal de layout, scroll e estado).
- `src/components/ui/dialog.tsx` só se for realmente necessário para um ajuste local de comportamento de overlay/foco (preferência: não mexer globalmente).

7) Critérios de aceite (validação)
- No viewport 1180x718:
  - consigo rolar com mouse wheel a lista de etapas e o formulário.
  - consigo clicar e interagir nos dois painéis com formulário aberto.
  - consigo chegar ao fim de “Visibilidade por Papel” e ver/usar os botões finais.
- Também validar em 1024x768 e mobile:
  - sem conteúdo cortado;
  - sem travar foco;
  - sem fechar modal ao usar select/checkbox.
