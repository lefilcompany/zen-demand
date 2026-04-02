

## Corrigir exibição de papéis no modal de adicionar membro ao quadro

### Problema
No modal "Adicionar Membros ao Quadro" (step 1), os membros da equipe aparecem com rótulos de papéis de quadro (ex: "Solicitante", "Agente") em vez dos papéis de equipe corretos. No nível da equipe, só existem dois papéis: **Dono** (admin no DB) e **Membro** (qualquer outro valor).

### Alterações

**1. `src/hooks/useBoardMembers.ts` — `useAvailableTeamMembers`**
- Mapear o `team_role` retornado do banco para o papel simplificado de equipe: `admin` → `"owner"`, qualquer outro → `"member"`.
- Isso garante que o componente receba apenas papéis de equipe válidos.

**2. `src/components/AddBoardMemberDialog.tsx`**
- No Step 1 (seleção de membros), usar a configuração de `owner`/`member` do `teamRoleConfig` para exibir o badge e o banner, em vez de usar diretamente o valor do DB que pode ser `requester`, `executor`, etc.
- No Step 2 (definição de cargos no quadro), remover o badge de papel de equipe ou mantê-lo como "Dono"/"Membro" — já que o papel de quadro é o que está sendo definido nessa etapa.

### Resultado esperado
- Step 1: cada card mostra "Dono" ou "Membro" com cores correspondentes (âmbar/cinza).
- Step 2: mantém o badge de equipe correto ("Dono"/"Membro") ao lado do nome, enquanto os botões de cargo de quadro continuam funcionando normalmente.

