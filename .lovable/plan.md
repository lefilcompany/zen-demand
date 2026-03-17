

## Plan: Apply CRM Layout Design to Admin Panel

### Goal
Replace the current plain admin sidebar with the same visual pattern used in the CRM's `ProtectedLayout`: dark sidebar background (`bg-sidebar`), `SidebarProvider` with collapsible sidebar, rounded main content area with shadow, top header bar with trigger and user avatar/logout.

### Changes

#### 1. Rewrite `src/pages/admin/AdminLayout.tsx`
- Use `SidebarProvider` + `Sidebar` (from shadcn) with `collapsible="icon"` — same as `AppSidebar`
- Wrap layout in `flex h-[100dvh] w-full bg-sidebar p-2 md:p-3 overflow-hidden` (matching ProtectedLayout)
- Main content in `flex-1 flex flex-col bg-background rounded-xl shadow-xl overflow-hidden min-h-0`
- Add a header bar with `SidebarTrigger`, "SoMA Admin" title, `ThemeToggle`, and user avatar dropdown with logout
- Content area: `flex-1 overflow-y-auto min-h-0 p-3 md:p-6` wrapping `<Outlet />`

#### 2. Create `src/components/AdminSidebar.tsx`
- Uses shadcn `Sidebar`, `SidebarContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`
- SoMA logo at top (full logo expanded, icon collapsed — same pattern as AppSidebar)
- Nav items: Dashboard, Cupons, Equipes, Usuários with icons
- Active state highlighting using `NavLink` component with `activeClassName`
- Bottom section: logout button
- Dark sidebar background matching the CRM sidebar colors

#### Files
- **Rewrite**: `src/pages/admin/AdminLayout.tsx`
- **Create**: `src/components/AdminSidebar.tsx`

No database changes needed.

