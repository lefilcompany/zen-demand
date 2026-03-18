

## Plano: Scroll automático ao topo ao mudar de página

### O que será feito
Criar um componente `ScrollToTop` que escuta mudanças de rota via `useLocation` e executa `window.scrollTo(0, 0)` a cada navegação. Colocá-lo dentro do `BrowserRouter` no `App.tsx`.

### Implementação

1. **Criar `src/components/ScrollToTop.tsx`** — componente simples com `useEffect` + `useLocation` que faz scroll to top
2. **Editar `src/App.tsx`** — adicionar `<ScrollToTop />` logo após o `<BrowserRouter>`

Além disso, como o layout usa `overflow-y-auto` no container principal (o `div.flex-1` dentro de `ProtectedLayout` e `AdminLayout`), será necessário também resetar o scroll desse container. Isso será feito adicionando um `useEffect` com `useLocation` no `ProtectedLayout.tsx` e `AdminLayout.tsx` que faz scroll do container interno para o topo.

