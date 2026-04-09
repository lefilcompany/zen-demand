

## Chat estilo WhatsApp/Discord — scroll e scrollbar

### O que muda

1. **Scroll padrão mostrando mensagens mais recentes**: O chat já faz scroll to bottom no mount e channel change (linha 97-99). Vou garantir que isso funcione de forma confiável adicionando um `requestAnimationFrame` + scroll após os dados carregarem (não apenas no mount).

2. **Scrollbar invisível que aparece ao scrollar**: Adicionar CSS customizado no container de mensagens para ocultar a scrollbar por padrão e mostrar apenas durante o scroll, com fade-out automático após parar — igual WhatsApp/Discord.

### Alterações técnicas

**Arquivo: `src/components/DemandChat.tsx`**

- No div da área de mensagens (linha 300-306), adicionar classe CSS `chat-scrollbar` 
- Adicionar `useEffect` que faz scroll to bottom quando `interactions` carregam pela primeira vez (não apenas no channel change)

**Arquivo: `src/index.css`**

- Adicionar regras CSS para `.chat-scrollbar`:
  - Esconder scrollbar por padrão (`scrollbar-width: none` / `::-webkit-scrollbar { opacity: 0 }`)
  - Ao fazer hover ou durante scroll, mostrar scrollbar fina com transição suave
  - Usar `scrollbar-gutter: stable` para evitar layout shift
  - Scrollbar fina (4-6px), arredondada, semi-transparente — estilo moderno

### Resultado esperado
- Ao abrir uma demanda, o chat mostra as mensagens mais recentes (fundo)
- Scrollbar fica invisível até o usuário interagir
- Ao scrollar, aparece uma scrollbar fina e discreta que some após ~1s de inatividade

