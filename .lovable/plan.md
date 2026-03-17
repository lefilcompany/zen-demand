
Objetivo: fazer o link público de demanda funcionar de forma estável para qualquer pessoa (logada ou não), em modo leitura, sem cair em “link expirado” indevidamente.

1) Diagnóstico confirmado no código atual
- O fluxo público está em `useSharedDemand` + `SharedDemand`.
- Há um problema real de ciclo de token:
  - `src/lib/demandShareUtils.ts` busca token apenas por `is_active = true` e pode reutilizar token já vencido.
  - `src/hooks/useShareDemand.ts` também não filtra expiração em algumas consultas.
- O “carregando por muito tempo” é agravado por retry padrão do React Query em erro de token inválido.
- `src/pages/SharedDemand.tsx` redireciona usuário logado para a tela interna (`/demands/:id`), o que conflita com comportamento de link público em modo leitor.
- Anexos públicos hoje usam `getPublicUrl` em bucket privado (`demand-attachments`), então o link da demanda pode abrir, mas anexos podem falhar para visitante anônimo.

2) Plano de correção (implementação)
A. Corrigir validade de token em toda a cadeia
- Ajustar consultas de token para considerar válido apenas:
  - `is_active = true`
  - `expires_at IS NULL OR expires_at > now()`
- Aplicar em:
  - `getOrCreateShareToken` (`src/lib/demandShareUtils.ts`)
  - `useShareToken` e `useSharedDemand` (`src/hooks/useShareDemand.ts`)
- Se existir token ativo porém expirado, desativar e gerar novo automaticamente no fluxo de criação/obtenção.

B. Remover fallback para URL privada (evitar forçar login)
- Em `buildPublicDemandUrl`, remover fallback para `/demands/:id`.
- Se não conseguir gerar token público, retornar erro explícito para o chamador tratar (toast/log), em vez de enviar link privado para email.

C. Modo leitor consistente (sem redirecionamento inesperado)
- Em `src/pages/SharedDemand.tsx`, remover o redirect automático de usuário logado para demanda interna.
- O link compartilhado deve sempre abrir a visualização pública em leitura.

D. Melhorar UX do carregamento/erro
- Em `useSharedDemand`, desabilitar retry automático para erro de token inválido (`retry: false`) e exibir erro rapidamente.
- Mensagem de erro diferenciada:
  - “Link inválido”
  - “Link expirado”
  - “Acesso temporariamente indisponível”

E. Corrigir acesso a anexos para público
- Implementar endpoint/função de backend para gerar URL assinada de anexo após validar token de compartilhamento da demanda.
- No `SharedDemand`, trocar `getPublicUrl` por URL assinada sob demanda.
- Resultado: visitante anônimo consegue abrir anexos sem autenticação, mantendo bucket privado.

F. Higienização de dados existentes
- Migration simples para desativar tokens ativos já vencidos:
  - `update demand_share_tokens set is_active=false where is_active=true and expires_at is not null and expires_at <= now();`
- Mantém base consistente para os novos fluxos.

3) Arquivos que serão ajustados
- `src/lib/demandShareUtils.ts`
- `src/hooks/useShareDemand.ts`
- `src/pages/SharedDemand.tsx`
- Novo ajuste de backend (migration + função/endpoint para URL assinada de anexos)
- Pontos que chamam `buildPublicDemandUrl` (tratamento de erro para não enviar link privado)

4) Validação (fim a fim)
- Criar link novo e abrir em janela anônima: deve abrir rápido em modo leitor.
- Abrir o mesmo link estando logado com usuário sem vínculo ao quadro: deve continuar em modo leitor (sem redirect interno).
- Testar link com expiração curta após vencimento: deve mostrar erro de expirado imediatamente (sem loading longo).
- Testar anexos no link público: abrir/baixar sem login.
- Testar envio de email com ação da demanda: confirmar que sempre envia URL pública válida.
