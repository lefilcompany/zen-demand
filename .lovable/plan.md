
Diagnóstico confirmado
- Do I know what the issue is? Sim.
- Hoje o botão **“Criar Quadro”** da tela sem quadros chama `navigate("/boards")`, mas o `ProtectedLayout` bloqueia essa rota quando `hasBoards=false`. Por isso parece que “não funciona”.
- Na mesma tela, como não há sidebar, faltam atalhos para **detalhes da equipe** (onde você vê código de acesso e gestão).

Plano de implementação

1) Corrigir o bloqueio de rota no cenário sem quadro  
- Arquivo: `src/components/ProtectedLayout.tsx`  
- Ajustar a regra `allowedWithoutBoards` para permitir acesso a rotas de setup mesmo sem quadro:
  - `/boards` (exato) para criação do primeiro quadro
  - `/teams` e `/teams/*` para detalhes/código da equipe
  - manter `/profile` e `/settings`
- Manter bloqueio dos módulos operacionais (kanban/demandas etc.) até existir quadro.

2) Melhorar a NoBoardsScreen para não deixar usuário “preso”  
- Arquivo: `src/components/NoBoardsScreen.tsx`  
- Manter CTA de admin para criar quadro, agora com rota funcional (`/boards` liberada).
- Adicionar ação visível **“Ver detalhes da equipe”** levando para `/teams/${currentTeam.id}`.
- Adicionar no menu do avatar item **“Detalhes da equipe”** (atalho rápido para código e gestão da equipe).

3) Resolver gargalo comum de criação do primeiro quadro  
- Ainda na `NoBoardsScreen`, para owner/admin adicionar ação secundária:
  - **“Gerenciar serviços”** -> `/teams/${currentTeam.id}/services`
- Isso evita bloqueio prático quando a equipe ainda não possui serviços configurados para o quadro.

4) Validação ponta a ponta (E2E)  
- Owner sem quadro: clicar “Criar Quadro” deve abrir `/boards` e permitir iniciar criação.
- Owner sem quadro: “Ver detalhes da equipe” deve abrir a página com código de acesso.
- Membro/requester sem quadro: não vê ações de admin, mas consegue acessar detalhes da equipe.
- Após criar o primeiro quadro: sair automaticamente do estado de espera e voltar ao layout normal.
- Validar desktop + mobile (botões e menu de avatar).

Detalhes técnicos
- Arquivos que serão alterados:  
  - `src/components/ProtectedLayout.tsx`  
  - `src/components/NoBoardsScreen.tsx`
- Sem mudança de banco/RLS/backend; é ajuste de regra de navegação e UX para estado “equipe sem quadro”.
