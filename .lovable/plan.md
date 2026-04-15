

# Plano: Modal de Atualização Profissional do SoMA

## Problema Atual
O banner de atualização PWA é pequeno, demora para detectar novas versões, e o botão "Atualizar" não limpa o cache corretamente, fazendo com que as novas features não sejam aplicadas.

## Solução

### 1. Substituir o banner por um Modal profissional
- Remover o banner simples e criar um modal centralizado com a logo do SoMA (`logo-soma.png` / `logo-soma-dark.png` baseado no tema)
- Título: "Novidades no SoMA!"
- Subtítulo explicativo sobre a nova versão disponível
- Botão primário "Atualizar agora" com ícone de refresh
- Botão secundário/ghost "Depois" para fechar o modal
- Design com backdrop blur, animação suave de entrada

### 2. Atualização com limpeza de cache real
Ao clicar em "Atualizar agora":
1. Salvar `access_token` e `refresh_token` do localStorage (chave `sb-*-auth-token`)
2. Limpar **todos** os caches do Service Worker via `caches.keys()` + `caches.delete()`
3. Limpar `localStorage` exceto os tokens de auth salvos
4. Limpar `sessionStorage`
5. Chamar `updateServiceWorker(true)` para ativar o novo SW
6. Forçar `window.location.reload()` após um pequeno delay

### 3. Detecção mais rápida de atualizações
- Configurar o `useRegisterSW` com `onRegisteredSW` para fazer polling a cada 60 segundos (atualmente depende do intervalo padrão do browser que pode ser muito longo)
- Isso garante que atualizações sejam detectadas em ~1 minuto para todos os usuários

### 4. Arquivos modificados
- **`src/components/UpdateBanner.tsx`** -- Renomear/reescrever para `UpdateModal.tsx` com o novo modal
- **`src/App.tsx`** -- Atualizar import de `UpdateBanner` para `UpdateModal`

### Detalhes Técnicos
- O polling de 60s usa `setInterval` dentro do callback `onRegisteredSW` do vite-plugin-pwa para chamar `registration.update()`
- A limpeza de cache preserva apenas a chave que começa com `sb-` e contém `auth-token` no localStorage
- O modal usa `Dialog` do shadcn/ui para manter consistência visual
- Suporta tema dark/light alternando entre `logo-soma.png` e `logo-soma-dark.png`

