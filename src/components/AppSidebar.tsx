import { LayoutDashboard, Users, Briefcase, Kanban, Archive, ChevronRight, ClipboardList, Settings2, FileText, Send, LayoutGrid, Settings, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoSoma from "@/assets/logo-soma-dark.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { LogoutDialog } from "@/components/LogoutDialog";
import { Badge } from "@/components/ui/badge";
import { usePendingRequestsCount as usePendingDemandRequestsCount, useReturnedRequestsCount } from "@/hooks/useDemandRequests";
import { usePendingRequestsCount as usePendingJoinRequestsCount } from "@/hooks/useTeamJoinRequests";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function AppSidebar() {
  const { t } = useTranslation();
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
  const { selectedBoardId } = useSelectedBoardSafe();
  const {
    data: role
  } = useTeamRole(selectedTeamId);
  const { data: boardRole } = useBoardRole(selectedBoardId);
  const { data: pendingDemandRequests } = usePendingDemandRequestsCount();
  const { data: pendingJoinRequests } = usePendingJoinRequestsCount(selectedTeamId);
  const { data: returnedRequestsCount } = useReturnedRequestsCount();
  
  const isTeamAdminOrModerator = role === "admin" || role === "moderator";
  const isBoardAdminOrModerator = boardRole === "admin" || boardRole === "moderator";
  const isRequester = boardRole === "requester";

  const baseMenuItems = [{
    title: t("dashboard.title"),
    url: "/",
    icon: LayoutDashboard
  }, {
    title: t("kanban.title"),
    url: "/kanban",
    icon: Kanban
  }, {
    title: t("demands.title"),
    url: "/demands",
    icon: Briefcase
  }];

  // Add demand requests link for admins/moderators
  const adminMenuItems = isBoardAdminOrModerator ? [{
    title: "Solicitações de Demanda",
    url: "/demand-requests",
    icon: FileText,
    showDemandRequestBadge: true
  }] : [];

  // Add my requests link for requesters
  const requesterMenuItems = isRequester ? [{
    title: "Minhas Solicitações",
    url: "/my-requests",
    icon: Send,
    showReturnedBadge: true
  }] : [];

  // "Minhas Demandas" only for non-requesters
  const myDemandsItems = !isRequester ? [{
    title: "Minhas Demandas",
    url: "/my-demands",
    icon: ClipboardList
  }] : [];

  const endMenuItems = [{
    title: t("demands.archived"),
    url: "/archived",
    icon: Archive
  }];

  const menuItems = [...baseMenuItems, ...adminMenuItems, ...requesterMenuItems, ...myDemandsItems, ...endMenuItems];

  // Keep team section expanded if on team/board routes
  const isOnTeamRoute = location.pathname.startsWith("/boards") || location.pathname.startsWith("/team-config") || location.pathname.includes("/services") || location.pathname.includes("/requests");
  const [teamOpen, setTeamOpen] = useState(isOnTeamRoute);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" data-tour="sidebar">
      <SidebarContent>
        <div className="p-4 items-center justify-center px-0 py-0 mx-0 my-[24px] flex flex-col">
          {isCollapsed ? (
            <img alt="SoMA" src="/lovable-uploads/8967ad53-156a-4e31-a5bd-b472b7cde839.png" className="h-5 w-5 object-scale-down" />
          ) : (
            <img src={logoSoma} alt="SoMA" className="h-10 w-auto" />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{t("common.actions")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
                const tourId = item.url === "/" ? "dashboard-link" 
                  : item.url === "/kanban" ? "kanban-link"
                  : item.url === "/demands" ? "demands-link"
                  : item.url === "/my-demands" ? "my-demands-link"
                  : item.url === "/archived" ? "archived-link"
                  : undefined;
                
                return (
                  <SidebarMenuItem key={item.title} className="relative" data-tour={tourId}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === "/"} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                        {!isCollapsed && (item as any).showDemandRequestBadge && typeof pendingDemandRequests === "number" && pendingDemandRequests > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                            {pendingDemandRequests}
                          </Badge>
                        )}
                        {!isCollapsed && (item as any).showReturnedBadge && typeof returnedRequestsCount === "number" && returnedRequestsCount > 0 && (
                          <Badge variant="outline" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs border-amber-500 text-amber-500 bg-amber-500/10">
                            {returnedRequestsCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                    {isCollapsed && (item as any).showDemandRequestBadge && typeof pendingDemandRequests === "number" && pendingDemandRequests > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1">
                        {pendingDemandRequests}
                      </Badge>
                    )}
                    {isCollapsed && (item as any).showReturnedBadge && typeof returnedRequestsCount === "number" && returnedRequestsCount > 0 && (
                      <Badge variant="outline" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1 border-amber-500 text-amber-500 bg-amber-500/10">
                        {returnedRequestsCount}
                      </Badge>
                    )}
                  </SidebarMenuItem>
                );
              })}

              {/* Equipe - Collapsible section for team and board management */}
              {isCollapsed ? (
                <SidebarMenuItem data-tour="teams-link">
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton tooltip="Equipe" className="hover:bg-sidebar-accent transition-colors">
                        <Users className="h-4 w-4" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" sideOffset={8} className="w-48 p-2 bg-sidebar border-sidebar-border z-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-sidebar-foreground/70 px-2 py-1">
                          Equipe
                        </span>
                        <NavLink to="/boards" onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <LayoutGrid className="h-4 w-4" />
                          Meus Quadros
                        </NavLink>
                        {isTeamAdminOrModerator && (
                          <NavLink to="/team-config" onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <Settings className="h-4 w-4" />
                            Configurações
                          </NavLink>
                        )}
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <NavLink to={`/teams/${selectedTeamId}/services`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <Settings2 className="h-4 w-4" />
                            Serviços
                          </NavLink>
                        )}
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors relative" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <UserPlus className="h-4 w-4" />
                            Solicitações
                            {typeof pendingJoinRequests === "number" && pendingJoinRequests > 0 && (
                              <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                                {pendingJoinRequests}
                              </Badge>
                            )}
                          </NavLink>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              ) : (
                <Collapsible open={teamOpen} onOpenChange={setTeamOpen} className="group/collapsible">
                  <SidebarMenuItem data-tour="teams-link">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Equipe" className="hover:bg-sidebar-accent transition-colors">
                        <Users className="h-4 w-4" />
                        <span className="flex-1">Equipe</span>
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/boards" onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                              <LayoutGrid className="h-4 w-4 mr-2" />
                              Meus Quadros
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        
                        {isTeamAdminOrModerator && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to="/team-config" onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <Settings className="h-4 w-4 mr-2" />
                                Configurações
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <SidebarMenuSubItem data-tour="services-link">
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/services`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <Settings2 className="h-4 w-4 mr-2" />
                                Serviços
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <SidebarMenuSubItem className="relative">
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Solicitações de Entrada
                                {typeof pendingJoinRequests === "number" && pendingJoinRequests > 0 && (
                                  <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                                    {pendingJoinRequests}
                                  </Badge>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
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
    </Sidebar>
  );
}
