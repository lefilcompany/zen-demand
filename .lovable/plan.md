

## Plan: Redesign AddBoardMemberDialog

### What changes

**1. Update `useAvailableTeamMembers` hook** (`src/hooks/useBoardMembers.ts`)
- Expand the `profiles` select to include `job_title`
- Also select `role` from `team_members` to show the team role
- Return `job_title` and `role` alongside existing fields

**2. Rewrite `AddBoardMemberDialog`** (`src/components/AddBoardMemberDialog.tsx`)
- Make dialog wider: `max-w-2xl` (matching AssigneeSelector style)
- Add search input with Search icon to filter by name or job_title
- Replace simple list items with card-style layout matching AssigneeSelector:
  - Colored gradient banner based on team role
  - Centered avatar overlapping the banner
  - Name, job title, and role badge
  - Selection checkmark indicator
- Use `useMemo` for filtered members
- Grid layout: `grid-cols-2 sm:grid-cols-3`
- Keep the role selector (RadioGroup) at the bottom when a member is selected, inside a collapsible border-t section
- Keep existing submit logic unchanged

### Visual structure

```text
┌─────────────────────────────────────────┐
│ Adicionar Membro ao Quadro              │
│ Selecione um membro...                  │
│ ┌─────────────────────────────────────┐ │
│ │ 🔍 Buscar por nome ou cargo...      │ │
│ └─────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │▓▓banner▓▓│ │▓▓banner▓▓│ │▓▓banner▓▓│ │
│ │  (avatar) │ │  (avatar) │ │  (avatar) │ │
│ │   Name    │ │   Name    │ │   Name    │ │
│ │  job_title│ │  job_title│ │  job_title│ │
│ │ [badge]   │ │ [badge]   │ │ [badge]   │ │
│ └──────────┘ └──────────┘ └──────────┘ │
│ ─────────────────────────────────────── │
│ Cargo no Quadro: [admin][coord][ag][sol]│
│ ─────────────────────────────────────── │
│              [Cancelar] [Adicionar]     │
└─────────────────────────────────────────┘
```

### Styling reference
Reuse the same `roleConfig` pattern from `AssigneeSelector.tsx` with gradient banners, badge colors, and icons per role.

