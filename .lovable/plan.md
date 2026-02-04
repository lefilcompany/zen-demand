
# Plano: Implementar Breadcrumb Navigation em Todas as Telas

## Objetivo
Adicionar navegação por breadcrumb (path track) em todas as telas da aplicação, substituindo os botões de "Voltar", e alterando "Início" para "Dashboard".

## Resumo das Alterações
- Atualizar o componente `PageBreadcrumb` para exibir "Dashboard" ao invés de "Início"
- Adicionar breadcrumbs em 17 páginas que ainda não possuem
- Remover botões de "Voltar" que serão substituídos pela navegação via breadcrumb
- Garantir que cada tela tenha o caminho correto desde o Dashboard

---

## Fase 1: Atualização do Componente Base

### 1.1 PageBreadcrumb.tsx
Alterar o texto "Início" para "Dashboard":
- Localização: `src/components/PageBreadcrumb.tsx`
- Linha 35: Mudar `<span>Início</span>` para `<span>Dashboard</span>`

---

## Fase 2: Páginas Principais (Sem Back Button para Remover)

### 2.1 Demands.tsx
- **Arquivo**: `src/pages/Demands.tsx`
- **Breadcrumb**: Dashboard > Demandas
- **Ação**: Adicionar `PageBreadcrumb` no início do componente

### 2.2 Kanban.tsx
- **Arquivo**: `src/pages/Kanban.tsx`
- **Breadcrumb**: Dashboard > Kanban
- **Ação**: Adicionar `PageBreadcrumb` no início do componente

### 2.3 ArchivedDemands.tsx
- **Arquivo**: `src/pages/ArchivedDemands.tsx`
- **Breadcrumb**: Dashboard > Arquivadas
- **Ação**: Adicionar `PageBreadcrumb` no início do componente

### 2.4 Store.tsx
- **Arquivo**: `src/pages/Store.tsx`
- **Breadcrumb**: Dashboard > Loja de Serviços
- **Ação**: Adicionar `PageBreadcrumb` no início do componente

### 2.5 TeamConfig.tsx
- **Arquivo**: `src/pages/TeamConfig.tsx`
- **Breadcrumb**: Dashboard > Configurações da Equipe
- **Ação**: Adicionar `PageBreadcrumb` no início do componente

### 2.6 TeamDemands.tsx
- **Arquivo**: `src/pages/TeamDemands.tsx`
- **Breadcrumb**: Dashboard > Visão Geral da Equipe
- **Ação**: Adicionar `PageBreadcrumb` no início do componente

---

## Fase 3: Páginas com Back Button (Remover e Substituir)

### 3.1 CreateDemand.tsx
- **Arquivo**: `src/pages/CreateDemand.tsx`
- **Breadcrumb**: Dashboard > Demandas > Nova Demanda
- **Ação**: 
  - Remover botão "Voltar" (linhas 246-252)
  - Adicionar `PageBreadcrumb` com caminho correto
  - Manter navegação ao cancelar via breadcrumb

### 3.2 CreateDemandRequest.tsx
- **Arquivo**: `src/pages/CreateDemandRequest.tsx`
- **Breadcrumb**: Dashboard > Minhas Solicitações > Nova Solicitação
- **Ação**: 
  - Remover botão "Voltar" (linhas 211-218)
  - Adicionar `PageBreadcrumb`

### 3.3 DemandRequests.tsx
- **Arquivo**: `src/pages/DemandRequests.tsx`
- **Breadcrumb**: Dashboard > Solicitações de Demanda
- **Ação**: 
  - Remover botão "Voltar" (linhas 329-332)
  - Adicionar `PageBreadcrumb`

### 3.4 MyDemandRequests.tsx
- **Arquivo**: `src/pages/MyDemandRequests.tsx`
- **Breadcrumb**: Dashboard > Minhas Solicitações
- **Ação**: 
  - Remover botão "Voltar" (linhas 143-146)
  - Adicionar `PageBreadcrumb`

### 3.5 Profile.tsx
- **Arquivo**: `src/pages/Profile.tsx`
- **Breadcrumb**: Dashboard > Meu Perfil
- **Ação**: 
  - Remover botão "Voltar" (linhas 199-202)
  - Adicionar `PageBreadcrumb`

### 3.6 Settings.tsx
- **Arquivo**: `src/pages/Settings.tsx`
- **Breadcrumb**: Dashboard > Configurações
- **Ação**: 
  - Remover botão "Voltar" (linhas 259-265)
  - Adicionar `PageBreadcrumb`

### 3.7 TeamRequests.tsx
- **Arquivo**: `src/pages/TeamRequests.tsx`
- **Breadcrumb**: Dashboard > Equipes > {Team Name} > Solicitações de Entrada
- **Ação**: 
  - Remover botão "Voltar" (linhas 133-139)
  - Adicionar `PageBreadcrumb`

### 3.8 ServicesManagement.tsx
- **Arquivo**: `src/pages/ServicesManagement.tsx`
- **Breadcrumb**: Dashboard > Equipes > {Team Name} > Serviços
- **Ação**: 
  - Remover botão "Voltar" (linhas 300-302)
  - Adicionar `PageBreadcrumb`

### 3.9 BoardMembers.tsx
- **Arquivo**: `src/pages/BoardMembers.tsx`
- **Breadcrumb**: Dashboard > Quadros > {Board Name} > Membros
- **Ação**: 
  - Remover botão "Voltar" (linha 114)
  - Adicionar `PageBreadcrumb`

### 3.10 UserProfile.tsx
- **Arquivo**: `src/pages/UserProfile.tsx`
- **Breadcrumb**: Dashboard > Perfil do Usuário
- **Ação**: 
  - Remover botão "Voltar" (linhas 283-286)
  - Adicionar `PageBreadcrumb`

---

## Fase 4: Ajustes em Páginas Existentes

### 4.1 Atualizar breadcrumbs existentes
Páginas que já têm breadcrumb serão atualizadas automaticamente quando alterarmos "Início" para "Dashboard" no componente base.

### 4.2 Padronização de ícones
Cada breadcrumb usará ícones apropriados do Lucide:
- Dashboard: `LayoutDashboard`
- Demandas: `Briefcase`
- Kanban: `Kanban`
- Equipes: `Users`
- Quadros: `LayoutGrid`
- Configurações: `Settings`
- Perfil: `User`
- Loja: `ShoppingCart`
- Arquivadas: `Archive`
- Solicitações: `ClipboardList`

---

## Detalhes Técnicos

### Estrutura de Breadcrumb Padrão
```typescript
<PageBreadcrumb
  items={[
    { label: "Seção", href: "/path", icon: IconComponent },
    { label: "Subseção", href: "/path/sub" },
    { label: "Página Atual", isCurrent: true },
  ]}
/>
```

### Arquivos a Serem Modificados (18 total)
1. `src/components/PageBreadcrumb.tsx` - Alterar "Início" para "Dashboard"
2. `src/pages/Demands.tsx` - Adicionar breadcrumb
3. `src/pages/Kanban.tsx` - Adicionar breadcrumb
4. `src/pages/ArchivedDemands.tsx` - Adicionar breadcrumb
5. `src/pages/CreateDemand.tsx` - Substituir back button
6. `src/pages/CreateDemandRequest.tsx` - Substituir back button
7. `src/pages/DemandRequests.tsx` - Substituir back button
8. `src/pages/MyDemandRequests.tsx` - Substituir back button
9. `src/pages/Profile.tsx` - Substituir back button
10. `src/pages/Settings.tsx` - Substituir back button
11. `src/pages/Store.tsx` - Adicionar breadcrumb
12. `src/pages/TeamConfig.tsx` - Adicionar breadcrumb
13. `src/pages/TeamDemands.tsx` - Adicionar breadcrumb
14. `src/pages/TeamRequests.tsx` - Substituir back button
15. `src/pages/ServicesManagement.tsx` - Substituir back button
16. `src/pages/BoardMembers.tsx` - Substituir back button
17. `src/pages/UserProfile.tsx` - Substituir back button
18. `src/pages/NoteDetail.tsx` - Verificar e adicionar se necessário

---

## Resultado Esperado
- Navegação consistente em todas as páginas
- Usuário pode entender onde está na hierarquia do app
- Navegação facilitada sem depender do botão "Voltar" do navegador
- Visual unificado com animações suaves de entrada dos breadcrumbs
