import { LayoutDashboard, Users, Briefcase, Kanban, Archive, ChevronRight, Settings, FileText, Send, LayoutGrid, UserPlus, UsersRound, Clock, Sparkles, ShoppingCart, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoSoma from "@/assets/logo-soma-dark.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { usePendingRequestsCount as usePendingDemandRequestsCount, useReturnedRequestsCount } from "@/hooks/useDemandRequests";
import { usePendingRequestsCount as usePendingJoinRequestsCount } from "@/hooks/useTeamJoinRequests";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { SidebarSyncIndicator } from "@/components/SidebarSyncIndicator";
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
  const isBoardAdminModeratorOrExecutor = boardRole === "admin" || boardRole === "moderator" || boardRole === "executor";
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

  // Add demand requests link for admins/moderators/executors
  const adminMenuItems = isBoardAdminModeratorOrExecutor ? [
    {
      title: "Solicitações de Demanda",
      url: "/demand-requests",
      icon: FileText,
      showDemandRequestBadge: true
    },
    ...(isBoardAdminOrModerator ? [{
      title: "Gerenciamento de Tempo",
      url: "/time-management",
      icon: Clock
    }] : [])
  ] : [];

  // Add my requests link for requesters
  const requesterMenuItems = isRequester ? [
    {
      title: "Loja de Serviços",
      url: "/store",
      icon: ShoppingCart
    },
    {
      title: "Minhas Solicitações",
      url: "/my-requests",
      icon: Send,
      showReturnedBadge: true
    }
  ] : [];

  const aiMenuItems = [
    {
      title: "Resumo IA",
      url: "/board-summary",
      icon: Sparkles
    }
  ];

  const endMenuItems = [{
    title: t("demands.archived"),
    url: "/archived",
    icon: Archive
  }];

  const menuItems = [...baseMenuItems, ...adminMenuItems, ...requesterMenuItems, ...aiMenuItems, ...endMenuItems];

  // Keep team section expanded if on team/board routes
  const isOnTeamRoute = location.pathname.startsWith("/boards") || location.pathname.startsWith("/team-config") || location.pathname.includes("/services") || location.pathname.includes("/requests") || location.pathname === "/team-demands";
  const [teamOpen, setTeamOpen] = useState(isOnTeamRoute);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };


  const showText = isMobile || !isCollapsed;

  return (
    <Sidebar collapsible="icon" data-tour="sidebar">
      <SidebarContent className="overflow-y-auto flex flex-col">
        <div className="p-4 items-center justify-center px-0 py-0 mx-0 my-4 md:my-6 flex flex-col">
          {isCollapsed && !isMobile ? (
            <img alt="SoMA" src="/lovable-uploads/8967ad53-156a-4e31-a5bd-b472b7cde839.png" className="h-5 w-5 object-scale-down" />
          ) : (
            <img src={logoSoma} alt="SoMA" className="h-8 md:h-10 w-auto" />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{t("common.actions")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map(item => {
                const tourId = item.url === "/" ? "dashboard-link" 
                  : item.url === "/kanban" ? "kanban-link"
                  : item.url === "/demands" ? "demands-link"
                  : item.url === "/archived" ? "archived-link"
                  : undefined;
                
                return (
                  <SidebarMenuItem key={item.title} className="relative" data-tour={tourId}>
                    <SidebarMenuButton asChild tooltip={item.title} size={isMobile ? "lg" : "default"}>
                      <NavLink to={item.url} end={item.url === "/"} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[44px] md:min-h-0" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-5 w-5 md:h-4 md:w-4" />
                        {showText && <span className="text-base md:text-sm">{item.title}</span>}
                        {showText && (item as any).showDemandRequestBadge && typeof pendingDemandRequests === "number" && pendingDemandRequests > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                            {pendingDemandRequests}
                          </Badge>
                        )}
                        {showText && (item as any).showReturnedBadge && typeof returnedRequestsCount === "number" && returnedRequestsCount > 0 && (
                          <Badge variant="outline" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs border-amber-500 text-amber-500 bg-amber-500/10">
                            {returnedRequestsCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                    {isCollapsed && !isMobile && (item as any).showDemandRequestBadge && typeof pendingDemandRequests === "number" && pendingDemandRequests > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1">
                        {pendingDemandRequests}
                      </Badge>
                    )}
                    {isCollapsed && !isMobile && (item as any).showReturnedBadge && typeof returnedRequestsCount === "number" && returnedRequestsCount > 0 && (
                      <Badge variant="outline" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1 border-amber-500 text-amber-500 bg-amber-500/10">
                        {returnedRequestsCount}
                      </Badge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team section - Moved to the end with enhanced styling */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {/* Equipe - Collapsible section for team and board management */}
              {isCollapsed && !isMobile ? (
                <SidebarMenuItem data-tour="teams-link">
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton 
                        tooltip="Equipe" 
                        className="hover:bg-primary/10 border border-sidebar-border/50 hover:border-primary/30 transition-all duration-200"
                      >
                        <Users className="h-4 w-4 text-primary" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent 
                      side="right" 
                      align="start" 
                      sideOffset={8} 
                      className="w-52 p-2 bg-popover/95 backdrop-blur-sm border-border shadow-lg rounded-xl animate-slide-up-fade z-50"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 px-2 py-2 mb-1">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            Equipe
                          </span>
                        </div>
                        {isTeamAdminOrModerator && (
                          <NavLink to="/team-demands" onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors" activeClassName="bg-accent text-primary font-medium">
                            <Layers className="h-4 w-4" />
                            Visão Geral
                          </NavLink>
                        )}
                        <NavLink to="/boards" onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors" activeClassName="bg-accent text-primary font-medium">
                          <LayoutGrid className="h-4 w-4" />
                          Meus Quadros
                        </NavLink>
                        {selectedTeamId && (
                          <NavLink to={`/teams/${selectedTeamId}`} end onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors" activeClassName="bg-accent text-primary font-medium">
                            <UsersRound className="h-4 w-4" />
                            Participantes
                          </NavLink>
                        )}
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <NavLink to={`/teams/${selectedTeamId}/services`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors" activeClassName="bg-accent text-primary font-medium">
                            <Settings className="h-4 w-4" />
                            Serviços
                          </NavLink>
                        )}
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors relative" activeClassName="bg-accent text-primary font-medium">
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
                      <SidebarMenuButton 
                        tooltip="Equipe" 
                        size={isMobile ? "lg" : "default"} 
                        className="border border-sidebar-border/50 hover:border-primary/30 hover:bg-primary/10 transition-all duration-200 min-h-[44px] md:min-h-0"
                      >
                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <span className="flex-1 text-base md:text-sm font-medium">Equipe</span>
                        <ChevronRight className="h-5 w-5 md:h-4 md:w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 opacity-50" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="animate-accordion-down">
                      <SidebarMenuSub>
                        {isTeamAdminOrModerator && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to="/team-demands" onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[40px] md:min-h-0 py-2 md:py-1.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <Layers className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                                <span className="text-base md:text-sm">Visão Geral</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/boards" onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[40px] md:min-h-0 py-2 md:py-1.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                              <LayoutGrid className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                              <span className="text-base md:text-sm">Meus Quadros</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        
                        {selectedTeamId && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}`} end onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[40px] md:min-h-0 py-2 md:py-1.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <UsersRound className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                                <span className="text-base md:text-sm">Participantes</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <SidebarMenuSubItem data-tour="services-link">
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/services`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[40px] md:min-h-0 py-2 md:py-1.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <Settings className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                                <span className="text-base md:text-sm">Serviços</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                        
                        {isTeamAdminOrModerator && selectedTeamId && (
                          <SidebarMenuSubItem className="relative">
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[40px] md:min-h-0 py-2 md:py-1.5" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <UserPlus className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                                <span className="text-base md:text-sm">Solicitações de Entrada</span>
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

        {/* Footer section with sync indicator only */}
        <SidebarGroup className="pb-4 md:pb-2">
          <SidebarGroupContent>
            <SidebarSyncIndicator isCollapsed={isCollapsed && !isMobile} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
