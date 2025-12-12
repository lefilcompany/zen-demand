import { LayoutDashboard, Users, Briefcase, Kanban, Archive, ChevronRight, Wrench, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const isAdminOrModerator = role === "admin" || role === "moderator";

  const menuItems = [{
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
  }, {
    title: t("dashboard.adjustments"),
    url: "/adjustments",
    icon: Wrench,
    showBadge: true
  }, {
    title: t("demands.archived"),
    url: "/archived",
    icon: Archive
  }];

  // Keep teams expanded if on teams routes
  const isOnTeamsRoute = location.pathname.startsWith("/teams");
  const [teamsOpen, setTeamsOpen] = useState(isOnTeamsRoute);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  return <Sidebar collapsible="icon" data-tour="sidebar">
      <SidebarContent>
        <div className="p-4 items-center justify-center px-0 py-0 mx-0 my-[24px] flex flex-col">
          {isCollapsed ? <img alt="SoMA" src="/lovable-uploads/8967ad53-156a-4e31-a5bd-b472b7cde839.png" className="h-5 w-5 object-scale-down" /> : <img src={logoSoma} alt="SoMA" className="h-10 w-auto" />}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{t("common.actions")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
                const tourId = item.url === "/" ? "dashboard-link" 
                  : item.url === "/kanban" ? "kanban-link"
                  : item.url === "/demands" ? "demands-link"
                  : item.url === "/adjustments" ? "adjustments-link"
                  : item.url === "/archived" ? "archived-link"
                  : undefined;
                
                return (
                  <SidebarMenuItem key={item.title} className="relative" data-tour={tourId}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === "/"} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                        {!isCollapsed && (item as any).showBadge && adjustmentCount > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                            {adjustmentCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                    {isCollapsed && (item as any).showBadge && adjustmentCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1">
                        {adjustmentCount}
                      </Badge>
                    )}
                  </SidebarMenuItem>
                );
              })}

              {/* Equipes - Popover quando colapsado, Collapsible quando expandido */}
              {isCollapsed ? <SidebarMenuItem data-tour="teams-link">
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton tooltip={t("teams.title")} className="hover:bg-sidebar-accent transition-colors relative">
                        <Users className="h-4 w-4" />
                        {typeof pendingCount === "number" && pendingCount > 0 && isAdmin && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0">
                            {pendingCount}
                          </Badge>}
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" sideOffset={8} className="w-48 p-2 bg-sidebar border-sidebar-border z-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-sidebar-foreground/70 px-2 py-1">
                          {t("teams.title")}
                        </span>
                        <NavLink to="/teams" end onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <Users className="h-4 w-4" />
                          {t("teams.myTeams")}
                        </NavLink>
                        
                        {isAdmin && selectedTeamId && <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <Users className="h-4 w-4" />
                            {t("teams.requests")}
                            {typeof pendingCount === "number" && pendingCount > 0 && <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                                {pendingCount}
                              </Badge>}
                          </NavLink>}
                        
                        {isAdminOrModerator && selectedTeamId && <NavLink to={`/teams/${selectedTeamId}/services`} onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                            <Settings2 className="h-4 w-4" />
                            {t("teams.services")}
                          </NavLink>}
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem> : <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen} className="group/collapsible">
                  <SidebarMenuItem data-tour="teams-link">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={t("teams.title")} className="hover:bg-sidebar-accent transition-colors">
                        <Users className="h-4 w-4" />
                        <span className="flex-1">{t("teams.title")}</span>
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
                              {t("teams.myTeams")}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        
                        {isAdmin && selectedTeamId && <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/requests`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                {t("teams.requests")}
                                {typeof pendingCount === "number" && pendingCount > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
                                    {pendingCount}
                                  </Badge>}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>}
                        
                        {isAdminOrModerator && selectedTeamId && <SidebarMenuSubItem data-tour="services-link">
                            <SidebarMenuSubButton asChild>
                              <NavLink to={`/teams/${selectedTeamId}/services`} onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                                <Settings2 className="h-4 w-4 mr-2" />
                                {t("teams.services")}
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