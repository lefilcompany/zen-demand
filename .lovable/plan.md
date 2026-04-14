

## Plano: Modal de Subdemanda maior + navegação estilo iPhone App Switcher

### Conceito

Implementar um sistema de navegação entre o modal pai (Criar Demanda) e o modal filho (Criar Subdemanda) inspirado no app switcher do iPhone. Em vez de empilhar dois Dialogs, vamos usar **um único Dialog container** com uma transição animada entre duas "telas" (views):

- **View 1**: Formulário de criação da demanda (atual)
- **View 2**: Formulário de criação da subdemanda

Quando o usuário clica em "Adicionar subdemanda", a View 1 desliza/reduz para a esquerda e a View 2 entra pela direita. Um indicador de navegação (dots ou breadcrumb) no topo permite voltar. Isso evita empilhamento de modals e dá a sensação fluida do iOS.

### Mudanças

**1. `src/pages/CreateDemand.tsx`**
- Remover o `CreateSubdemandDialog` como componente separado com seu próprio `<Dialog>`
- Adicionar estado `activeView: 'demand' | 'subdemand'` para controlar qual tela está visível
- Envolver o conteúdo do DialogContent em um container com `overflow-hidden` e duas divs lado a lado que transicionam via `transform: translateX`
- Adicionar indicador de navegação (dots) no header para mostrar qual tela está ativa e permitir voltar
- Quando `activeView === 'subdemand'`, o formulário da demanda pai fica "atrás" (preservando estado) e o formulário da subdemanda aparece

**2. `src/components/CreateSubdemandDialog.tsx`**
- Transformar de Dialog completo para um componente de formulário puro (sem wrapper `<Dialog>`)
- Exportar como `CreateSubdemandForm` — apenas o conteúdo interno (header, campos, footer)
- Aumentar o tamanho: usar `sm:max-w-2xl` no container pai (no CreateDemand)
- O botão "Cancelar" da subdemanda volta para a View 1 (em vez de fechar o modal)

### Estrutura visual

```text
┌─────────────────────────────────────────┐
│  ● ○  (dots: Demanda / Subdemanda)      │
│  ← Voltar para demanda                  │
├─────────────────────────────────────────┤
│                                         │
│   [Formulário da Subdemanda]            │
│   - Título                              │
│   - Serviço (herdado, read-only)        │
│   - Responsáveis                        │
│   - Status / Prioridade / Data          │
│   - Dependência                         │
│   - Descrição                           │
│                                         │
├─────────────────────────────────────────┤
│              Cancelar  |  Adicionar     │
└─────────────────────────────────────────┘
```

### Detalhes técnicos

- A transição usa `transition-transform duration-300` com `translateX(0)` e `translateX(-100%)` para alternar views
- O modal principal cresce para `sm:max-w-2xl` para acomodar melhor os campos
- O estado do formulário pai é preservado durante a navegação (não reseta)
- Ao salvar a subdemanda, volta automaticamente para a View 1
- Os dots indicadores são clicáveis para navegação direta

