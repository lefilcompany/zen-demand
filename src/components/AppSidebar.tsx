import { LayoutDashboard, Users, Briefcase, Kanban, Archive, ChevronRight, User, Wrench, Settings2 } from "lucide-react";
import logoSoma from "@/assets/logo-soma-dark.png";
import logoSomaIcon from "@/assets/logo-soma-icon.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { LogoutDialog } from "@/components/LogoutDialog";
import { Badge } from "@/components/ui/badge";
import { usePendingRequestsCount } from "@/hooks/useTeamJoinRequests";
import { useIsTeamAdmin, useTeamRole } from "@/hooks/useTeamRole";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useAdjustmentCount } from "@/hooks/useAdjustmentCount";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  title: "Ajustes",
  url: "/adjustments",
  icon: Wrench,
  showBadge: true
}, {
  title: "Arquivadas",
  url: "/archived",
  icon: Archive
}];
export function AppSidebar() {
  const {
    state,
    setOpenMobile,
    isMobile
  } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const {
    selectedTeamId
  } = useSelectedTeam();
  const {
    isAdmin
  } = useIsTeamAdmin(selectedTeamId);
  const {
    data: role
  } = useTeamRole(selectedTeamId);
  const {
    data: pendingCount
  } = usePendingRequestsCount(isAdmin ? selectedTeamId : null);
  const adjustmentCount = useAdjustmentCount(selectedTeamId);
  const isRequester = role === "requester";
  const isAdminOrModerator = role === "admin" || role === "moderator";

  // Keep teams expanded if on teams routes
  const isOnTeamsRoute = location.pathname.startsWith("/teams");
  const [teamsOpen, setTeamsOpen] = useState(isOnTeamsRoute);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  return <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 items-center justify-center px-0 py-0 mx-0 my-[24px] flex flex-col">
          {isCollapsed ? <img alt="SoMA" src="/lovable-uploads/8967ad53-156a-4e31-a5bd-b472b7cde839.png" className="h-5 w-5 object-scale-down" /> : <img src={logoSoma} alt="SoMA" className="h-10 w-auto" />}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Meu Painel - Only for Requesters */}
              {isRequester && <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Meu Painel">
                    <NavLink to="/client-dashboard" onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <User className="h-4 w-4" />
                      {!isCollapsed && <span>Meu Painel</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>}

              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/"} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors relative" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                      {(item as any).showBadge && adjustmentCount > 0 && (
                        <Badge variant="destructive" className={isCollapsed ? "absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0" : "ml-auto h-5 min-w-5 flex items-center justify-center text-xs"}>
                          {adjustmentCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}

              {/* Equipes - Popover quando colapsado, Collapsible quando expandido */}
              {isCollapsed ? <SidebarMenuItem>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton tooltip="Equipes" className="hover:bg-sidebar-accent transition-colors relative">
                        <Users className="h-4 w-4" />
                        {typeof pendingCount === "number" && pendingCount > 0 && isAdmin && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0">
                            {pendingCount}
                          </Badge>}
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" sideOffset={8} className="w-48 p-2 bg-sidebar border-sidebar-border z-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-sidebar-foreground/70 px-2 py-1">
                          Equipes
                        </span>
                        <NavLink to="/teams" end onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <Users className="h-4 w-4" />
                          Minhas Equipes
                        </NavLink>
                        
                        {isAdmin && selectedTeamId && <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <Users className="h-4 w-4" />
                            Solicitações
                            {typeof pendingCount === "number" && pendingCount > 0 && <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                                {pendingCount}
                              </Badge>}
                          </NavLink>}
                        
                        {isAdminOrModerator && selectedTeamId && <NavLink to={`/teams/${selectedTeamId}/services`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <Settings2 className="h-4 w-4" />
                            Serviços
                          </NavLink>}
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem> : <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Equipes" className="hover:bg-sidebar-accent transition-colors">
                        <Users className="h-4 w-4" />
                        <span className="flex-1">Equipes</span>
                        {typeof pendingCount === "number" && pendingCount > 0 && isAdmin && <Badge variant="destructive" className="mr-1 h-5 min-w-5 flex items-center justify-center text-xs">
                            {pendingCount}
                          </Badge>}
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/teams" end onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                              Minhas Equipes
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        
                        {isAdmin && selectedTeamId && <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                Solicitações
                                {typeof pendingCount === "number" && pendingCount > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
                                    {pendingCount}
                                  </Badge>}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>}
                        
                        {isAdminOrModerator && selectedTeamId && <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/services`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <Settings2 className="h-4 w-4 mr-2" />
                                Serviços
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <LogoutDialog isCollapsed={isCollapsed} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}