## Objetivo

Reorganizar **/settings** e **/profile** num layout único de duas colunas (mini-card de identidade + sidebar à esquerda, conteúdo da seção à direita), seguindo o padrão visual das imagens enviadas. Tudo que já existe é preservado — apenas reorganizado, modularizado e com edição mais visível e direta (inline, não escondida em drawer).

## Estrutura final

Rota `/settings` passa a ter um shell com sidebar e conteúdo. Cada item da sidebar carrega uma seção (componente isolado em `src/components/settings/`).

```text
/settings
├─ [SettingsSidebar]              ┌─ [Section content]
│   • Card identidade (avatar,    │   Cabeçalho com ícone + título +
│     nome, e-mail, plano,        │   descrição + botão "Salvar" quando
│     botão "Ver perfil público") │   aplicável (padrão das imagens).
│   • Perfil                      │
│   • Segurança                   │
│   • Preferências                │
│   • Notificações                │
│   • Equipe (se houver)          │
│   • Conta                       │
```

`/profile` continua existindo e mantém o perfil público com banner, nível, XP, conquistas, badges e estatísticas (gamificação) — acessível via link "Ver perfil público" no card de identidade da sidebar e via avatar.

## Seções (todas mantêm a lógica atual)

1. **Perfil** — `ProfileSection.tsx`
   Edição inline (sem drawer): nome, cargo/função, bio, localização, e-mail (read-only com selo "verificado"), telefone, estado/cidade (placeholders já visíveis na referência), website, LinkedIn, GitHub. Upload/troca de avatar inline. Botão "Salvar alterações" no topo direito do card (padrão da imagem).
   Reaproveita a lógica de `ProfileEditDrawer.tsx` (mutations, upload de avatar) movida para o componente da seção. O `ProfileEditDrawer` antigo é descontinuado (mantemos as funções extraídas).

2. **Segurança** — `SecuritySection.tsx`
   Alterar senha (atual → nova → confirmar) reutilizando o fluxo `verifyPassword` + `updateUser` já existente. Layout idêntico à imagem 2 (campos empilhados, botão "Atualizar senha" no rodapé direito).

3. **Preferências** — `PreferencesSection.tsx`
   Tema (claro/escuro/sistema) com toggle/segmented, idioma (PT/EN/ES) e toggle global "Notificações" (atalho que liga/desliga e-mail+push). Layout linha-a-linha como imagem 3.

4. **Notificações** — `NotificationsSection.tsx`
   Toda a lógica atual: canais (e-mail, push, ativação push do navegador, botão de teste) + tipos (demandas, equipe, prazos, ajustes, menções) + bloco "Aprovações" (modo `ask|all|none` + incluir criador). Sem perdas.

5. **Equipe** — `TeamSection.tsx` (só aparece se `currentTeam`)
   Sair da equipe (com fluxo de transferência de admin se for owner) + Excluir equipe (com verificação de senha) — exatamente o que existe hoje.

6. **Conta** — `AccountSection.tsx`
   Bloco "Informações Legais" (Política de Privacidade, Termos de Uso, Central de Ajuda) + "Zona de Perigo" (Sair da conta, Excluir conta) — como na imagem 4. "Excluir conta" abre AlertDialog com confirmação por senha (mesmo padrão de excluir equipe).

## Componentes novos

- `src/pages/Settings.tsx` — vira shell que gerencia seção ativa (via `useState` + querystring `?tab=`).
- `src/components/settings/SettingsSidebar.tsx` — card de identidade (avatar, nome, e-mail, badge do plano via `useSubscription`, botão "Ver perfil público" → `navigate('/profile')`) + lista de seções com ícone, título, descrição e chevron, item ativo com borda esquerda accent (#F28705) como na referência.
- `src/components/settings/SectionShell.tsx` — wrapper padrão (ícone redondo + título + descrição + slot de ação no topo direito + corpo).
- `src/components/settings/{Profile,Security,Preferences,Notifications,Team,Account}Section.tsx`.

## Detalhes de UX/Design

- Layout `grid grid-cols-[280px_1fr] gap-6` em ≥ md; em mobile vira accordion/lista vertical (sidebar acima, seção abaixo).
- Cards `rounded-xl shadow-sm border` em fundo `bg-card`, conforme padrão SoMA já em uso.
- Item ativo da sidebar: `text-primary` + barra lateral 3px `#F28705` + chevron preenchido.
- Topo da página mantém `<PageBreadcrumb>` + título "Configurações" e descrição.
- Toda string passa por `useTranslation` (chaves já existentes; novas em `pt-BR/en-US/es`).
- Acessibilidade: navegação por teclado entre itens da sidebar, `aria-current="page"` no item ativo.

## Detalhes técnicos

- Rota: `/settings` aceita `?tab=profile|security|preferences|notifications|team|account` para deep-link (e os links no Topbar/Sidebar global continuam funcionando).
- O `ProfileEditDrawer.tsx` deixa de ser aberto a partir de `Profile.tsx`; o botão "Editar Perfil" em `/profile` passa a navegar para `/settings?tab=profile`. O arquivo do drawer permanece (não removido) para evitar quebra, mas sem consumidores — ou removido se não houver outros usos (verificar com `rg ProfileEditDrawer`).
- Em `/profile`, o card de identidade do topo ganha um link discreto "Editar no painel de configurações".
- Plano do usuário no card da sidebar: usa `useSubscription` (já existente) com fallback "Plano Gratuito".
- "Excluir conta": chama `supabase.auth.admin`-equivalente via edge function existente OU exibe instrução; se não houver função, criar `delete-account` edge function (security-definer) que apaga `profiles` do usuário e chama `auth.admin.deleteUser` (service role). Confirmar via `tool_search` se já existe; senão, criar.
- Nada na lógica de notificações, push, idiomas, tema, equipe, aprovação é alterado — apenas movido.

## Não-objetivos

- Não mexer no schema do banco.
- Não alterar a página pública `/profile` e `/user/:userId` além do botão de editar.
- Não remover funcionalidades existentes.

## Entregáveis

- Settings.tsx refatorado + 6 componentes de seção + sidebar + shell.
- `/profile` ajustado (botão de editar aponta para `/settings?tab=profile`).
- Traduções novas (apenas rótulos novos das seções).
- (Se necessário) edge function `delete-account`.