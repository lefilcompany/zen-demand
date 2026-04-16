

# Visual Connector Between Parent and Sub-demand Cards

## What we're building
A vertical connector line on the left side of sub-demand cards that visually links them to their parent demand, creating a tree-like hierarchy view in the Kanban column.

## Approach
Instead of modifying each card individually, we'll update `renderColumnContent` to wrap groups of parent + sub-demands with a visual connector. Each sub-demand card will get a left border line with a small branch connector, similar to a file tree view.

## Technical Plan

### 1. Update `renderColumnContent` in `KanbanBoard.tsx`
- Instead of flat-mapping demands, detect groups (parent + its children)
- Wrap sub-demand cards in a container with a left vertical line (`border-l-2 border-primary/30`) and small horizontal branch indicators
- The parent card stays normal; sub-demands below get the tree connector treatment

### 2. Add connector styling to sub-demand cards
- Each sub-demand will be wrapped in a `relative` div with:
  - A vertical line on the left (`before` pseudo-element or border-left)
  - A small horizontal branch line connecting to the card
  - Last sub-demand gets a shorter vertical line (L-shaped end)
- Use `ml-4` indent + `border-l-2 border-primary/25` on the group wrapper
- Each sub-demand gets a small horizontal line via `before` pseudo-element

### 3. Visual details
```text
┌──────────────────┐
│ #0049 PRINCIPAL  │  ← Parent card (normal)
│ teste            │
└──────────────────┘
  │
  ├─ ┌──────────────┐
  │  │ #0050 SUB    │  ← Sub-demand with connector
  │  │ teste 2      │
  │  └──────────────┘
  │
  └─ ┌──────────────┐
     │ #0051 SUB    │  ← Last sub-demand (L-connector)
     │ teste 3      │
     └──────────────┘
```

### Files to modify
- **`src/components/KanbanBoard.tsx`**: Update `renderColumnContent` to group demands and render tree connectors around sub-demand cards using relative positioning and CSS borders/pseudo-elements
- **`src/index.css`** (optional): Add a small utility class for the horizontal branch line if Tailwind alone isn't sufficient

