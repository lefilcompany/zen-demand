

## Plano: Pastas de Projeto para agrupar demandas

### Conceito
Criar um recurso de "Pastas" (ou "Projetos") que funciona como agrupador de demandas de diferentes quadros. As pastas aparecem entre a barra de pesquisa e a toolbar de filtros na página de Demandas, com visual inspirado no Google Drive. Quando nenhuma pasta existe, mostra um card pontilhado de criação.

### Mudanças no banco de dados

**Nova tabela `demand_folders`:**
- `id` (uuid, PK)
- `name` (text, not null)
- `color` (text, default '#6B7280')
- `team_id` (uuid, FK teams)
- `created_by` (uuid, FK profiles)
- `created_at`, `updated_at`

**Nova tabela `demand_folder_items`:**
- `id` (uuid, PK)
- `folder_id` (uuid, FK demand_folders, cascade)
- `demand_id` (uuid, FK demands, cascade)
- `added_at` (timestamptz)
- Unique constraint em (folder_id, demand_id)

**RLS:** Membros do time podem ler/criar/editar pastas do seu time. Apenas o criador ou admins podem deletar.

### Novos arquivos

1. **`src/hooks/useDemandFolders.ts`** — CRUD de pastas e itens (listar, criar, renomear, deletar, adicionar/remover demandas)

2. **`src/components/DemandFolderStrip.tsx`** — Faixa horizontal de pastas estilo Google Drive:
   - Cards compactos com ícone de pasta, nome e contador de demandas
   - Menu de 3 pontos (renomear, cor, excluir)
   - Card pontilhado "Criar nova pasta" quando vazio ou sempre no final
   - Scroll horizontal em mobile
   - Ao clicar numa pasta, filtra as demandas para mostrar apenas as da pasta

3. **`src/components/CreateFolderDialog.tsx`** — Dialog para criar/renomear pasta com nome e cor

4. **`src/components/FolderDemandManager.tsx`** — Interface para adicionar/remover demandas de uma pasta (acessível pelo menu da pasta)

### Alterações em arquivos existentes

- **`src/pages/Demands.tsx`** — Inserir `<DemandFolderStrip>` entre a barra de pesquisa (linha ~321) e a toolbar de filtros (linha ~324). Adicionar estado `selectedFolderId` que, quando ativo, filtra `filteredDemands` para exibir apenas demandas da pasta selecionada.

### Visual
- Pastas com fundo `bg-muted/50`, borda sutil, ícone `FolderOpen` do Lucide, nome truncado e badge com contagem
- Estado vazio: border-dashed, ícone de pasta com "+", texto "Criar pasta"
- Pasta selecionada: destaque com `ring-2 ring-primary`

### Fluxo do usuário
1. Vê a faixa de pastas (vazia = card pontilhado convidando a criar)
2. Clica para criar → dialog com nome e cor
3. Pasta criada aparece na faixa
4. Menu ⋮ da pasta → "Gerenciar demandas" abre seletor para adicionar demandas de qualquer quadro
5. Clica na pasta → filtra a lista para só mostrar demandas dessa pasta
6. Clica novamente → deseleciona e volta à listagem normal

