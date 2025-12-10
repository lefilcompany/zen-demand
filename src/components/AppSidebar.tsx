import { LayoutDashboard, Users, Briefcase, Settings, Kanban, Archive } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { LogoutDialog } from "@/components/LogoutDialog";
const menuItems = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard
}, {
  title: "Kanban",
  url: "/kanban",
  icon: Kanban
}, {
  title: "Demandas",
  url: "/demands",
  icon: Briefcase
}, {
  title: "Arquivadas",
  url: "/archived",
  icon: Archive
}, {
  title: "Equipes",
  url: "/teams",
  icon: Users
}, {
  title: "Configurações",
  url: "/settings",
  icon: Settings
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  return <Sidebar collapsible="icon">
      <SidebarContent>
        {!isCollapsed && (
          <div className="p-4">
            <div className="items-center justify-center gap-0 flex flex-col">
              <h2 className="text-xl font-bold text-sidebar-foreground">
                DemandFlow
              </h2>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <LogoutDialog isCollapsed={isCollapsed} />
        </div>
      </SidebarContent>
    </Sidebar>;
}