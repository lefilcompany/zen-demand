

## Problema

Quando o usuário está na página de detalhe de uma demanda, o `useEffect` no `DemandDetail.tsx` (linha 156-160) força o contexto do quadro para o quadro da demanda. Isso impede qualquer troca de quadro pelo `BoardSelector` — a seleção é imediatamente revertida.

## Solução

### 1. BoardSelector — adicionar confirmação e navegação (`src/components/BoardSelector.tsx`)

Modificar `handleBoardChange` para:
- Detectar se o usuário está numa rota de detalhe de demanda (`/demands/:id`)
- Se estiver, mostrar um **toast de confirmação** (usando `toast` do sonner com botão de ação) perguntando "Deseja mudar de quadro? Você será redirecionado."
- Incluir um **checkbox "Não perguntar novamente"** persistido em `localStorage`
- Se o usuário confirmar (ou se já marcou "não perguntar"), trocar o board e navegar para a tela de origem:
  - Se veio do Kanban → `/kanban`
  - Se veio de Demandas → `/demands`
  - Default → `/demands`

### 2. DemandDetail — não bloquear troca externa (`src/pages/DemandDetail.tsx`)

Modificar o `useEffect` da linha 156-160 para só sincronizar o board **na montagem inicial** do componente (ou quando o `demandBoardId` muda pela primeira vez), não continuamente. Usar um `ref` para controlar isso:

```tsx
const boardSyncedRef = useRef(false);
useEffect(() => {
  if (demandBoardId && !boardSyncedRef.current) {
    if (selectedBoardId !== demandBoardId) {
      setSelectedBoardId(demandBoardId);
    }
    boardSyncedRef.current = true;
  }
}, [demandBoardId]);
```

### 3. Lógica de navegação no BoardSelector

```tsx
const handleBoardChange = (newBoardId: string) => {
  if (newBoardId === selectedBoardId) return;
  
  const isDemandDetail = location.pathname.match(/^\/demands\/[^/]+$/);
  const skipConfirm = localStorage.getItem("skipBoardChangeConfirm") === "true";
  
  if (isDemandDetail && !skipConfirm) {
    // Mostrar dialog/toast de confirmação
    // Se confirmar: setSelectedBoardId(newBoardId) + navigate(targetRoute)
  } else if (isDemandDetail) {
    // Já marcou "não perguntar" — trocar e navegar direto
    setSelectedBoardId(newBoardId);
    navigate(cameFromKanban ? "/kanban" : "/demands");
  } else {
    setSelectedBoardId(newBoardId);
  }
};
```

Usarei um **AlertDialog** (não toast) para a confirmação, pois permite o checkbox "não mostrar novamente" de forma mais natural.

### Arquivos alterados
- **`src/components/BoardSelector.tsx`** — adicionar lógica de confirmação com AlertDialog e navegação condicional
- **`src/pages/DemandDetail.tsx`** — limitar auto-sync do board à montagem inicial

