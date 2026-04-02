
Objetivo: corrigir a área de anexos da demanda para exibir até 3 itens visíveis por padrão e, quando houver mais, permitir rolagem apenas nessa lista.

1. Revisar o componente certo
- O problema está em `src/components/AttachmentUploader.tsx`, que é o bloco usado em `src/pages/DemandDetail.tsx`.
- Confirmar que o ajuste ficará somente nessa seção da demanda, sem mexer nos anexos do chat.

2. Corrigir a causa do scroll não aparecer
- Hoje a lista usa `ScrollArea` com `max-h-[240px]`.
- O comportamento atual tende a falhar porque esse `ScrollArea` depende melhor de uma altura efetiva, e com apenas `max-height` o viewport pode crescer junto com o conteúdo.
- A correção mais segura é trocar essa área por um container nativo com `overflow-y-auto` + `max-height`, ou então usar altura controlada apenas quando houver mais de 3 anexos.
- Vou priorizar a abordagem mais confiável visualmente: scroll nativo só na lista de anexos da demanda.

3. Limitar a visualização a 3 anexos
- Aplicar altura máxima pensada para aproximadamente 3 cards.
- Garantir espaçamento interno e `pr-*` para não cortar ícones nem ficar colado na barra de scroll.
- Se houver 1, 2 ou 3 anexos, a área cresce só até o necessário, sem espaço vazio exagerado.

4. Manter todos os anexos acessíveis
- Continuar renderizando a lista completa.
- O scroll deve aparecer apenas quando a quantidade ultrapassar o limite visual.
- Nenhum anexo deve “sumir” por clipping do container.

5. Validar impactos visuais
- Conferir se preview, download e exclusão continuam funcionando normalmente dentro da área rolável.
- Verificar se o último item da lista fica totalmente visível.
- Garantir que o upload drag-and-drop acima não seja afetado.

Seções técnicas
- Arquivo principal: `src/components/AttachmentUploader.tsx`
- Arquivo de uso: `src/pages/DemandDetail.tsx`
- Ajuste provável:
  - remover o `ScrollArea` dessa lista específica, ou
  - condicionar a altura/overflow com container nativo
- Regra final esperada:
  - até 3 anexos: sem scroll
  - mais de 3 anexos: scroll vertical apenas nessa lista
