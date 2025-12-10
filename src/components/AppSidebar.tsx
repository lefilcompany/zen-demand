import { LayoutDashboard, Users, Briefcase, Settings, Kanban, Archive, UserPlus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { LogoutDialog } from "@/components/LogoutDialog";
import { Badge } from "@/components/ui/badge";
import { usePendingRequestsCount } from "@/hooks/useTeamJoinRequests";
import { useIsTeamAdmin } from "@/hooks/useTeamRole";
import { useSelectedTeam } from "@/contexts/TeamContext";

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
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  
  const { selectedTeamId } = useSelectedTeam();
  const { isAdmin } = useIsTeamAdmin(selectedTeamId);
  const { data: pendingCount } = usePendingRequestsCount(isAdmin ? selectedTeamId : null);

  return (
    <Sidebar collapsible="icon">
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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Pending Requests - only for admins */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/teams/${selectedTeamId}/requests`}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <UserPlus className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          Solicitações
                          {pendingCount && pendingCount > 0 ? (
                            <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
                              {pendingCount}
                            </Badge>
                          ) : null}
                        </span>
                      )}
                      {isCollapsed && pendingCount && pendingCount > 0 ? (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0">
                          {pendingCount}
                        </Badge>
                      ) : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <LogoutDialog isCollapsed={isCollapsed} />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}