import { LayoutDashboard, Users, User, Briefcase, Kanban, ChevronUp, Settings, FileText, Send, LayoutGrid, UserPlus, UsersRound, Clock, Sparkles, ShoppingCart, Layers, StickyNote, LayoutList } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoSoma from "/lovable-uploads/2c7c25a3-682b-4526-b7f8-41f2197c8f60.png";
...
            <img src={logoSoma} alt="SoMA" className="h-8 md:h-10 w-auto" />
          )}
        </NavLink>

        <SidebarGroup>
          <SidebarGroupLabel>{t("common.actions")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map(item => {
              const tourId = item.url === "/" ? "dashboard-link" 
                  : item.url === "/kanban" ? "kanban-link"
                  : item.url === "/demands" ? "demands-link"
                  : undefined;
                
                return (
                <SidebarMenuItem key={item.title} className="relative" data-tour={tourId}>
                    <SidebarMenuButton asChild tooltip={item.title} size={isMobile ? "lg" : "default"}>
                      <NavLink to={item.url} end onClick={closeMobileSidebar} className="hover:bg-sidebar-accent transition-colors min-h-[44px] md:min-h-0" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
                        {showText && <span className="text-base md:text-sm flex-1">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                    {showText && (item as any).showDemandRequestBadge && typeof pendingDemandRequests === "number" && pendingDemandRequests > 0 && (
                      <Badge className="absolute right-2 top-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1 rounded-full bg-[#F28705] text-white border-0">
                        {pendingDemandRequests}
                      </Badge>
                    )}
                    {showText && (item as any).showReturnedBadge && typeof returnedRequestsCount === "number" && returnedRequestsCount > 0 && (
                      <Badge variant="outline" className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-5 flex items-center justify-center text-xs border-amber-500 text-amber-500 bg-amber-500/10">
                        {returnedRequestsCount}
                      </Badge>
                    )}
                    {isCollapsed && !isMobile && (item as any).showDemandRequestBadge && typeof pendingDemandRequests === "number" && pendingDemandRequests > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 px-1 rounded-full bg-[#F28705] text-white border-0">
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

        {/* Active Timers Section - Above Team section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarActiveTimers />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team section */}
        <SidebarGroup className="mt-auto pb-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
{/* Equipe - Dropdown style like reference image */}
              <SidebarMenuItem data-tour="teams-link">
                <DropdownMenu open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className={`
                              flex items-center transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-primary/20
                              ${isCollapsed && !isMobile 
                                ? `w-10 h-10 justify-center rounded-full border border-sidebar-border/50 hover:border-primary/40 hover:bg-primary/10 ${popoverOpen ? 'bg-primary/15 border-primary/40 ring-2 ring-primary/20' : ''}`
                                : `w-full gap-3 p-2.5 rounded-xl border border-sidebar-border/50 hover:border-primary/30 hover:bg-sidebar-accent/50 ${popoverOpen ? 'bg-sidebar-accent/50 border-primary/30' : ''}`
                              }
                            `}
                          >
                            <div className={`
                              flex items-center justify-center bg-gradient-to-br from-primary/25 to-primary/10 
                              ${isCollapsed && !isMobile 
                                ? 'h-7 w-7 rounded-full' 
                                : 'h-8 w-8 rounded-full ring-1 ring-primary/20'
                              }
                            `}>
                              <Users className={`text-primary ${isCollapsed && !isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                            </div>
                            {(!isCollapsed || isMobile) && (
                              <>
                                <div className="flex-1 text-left min-w-0">
                                  <span className="text-sm font-medium text-sidebar-foreground block truncate">{currentTeam?.name || "Equipe"}</span>
                                  {subscription?.plan?.name && (
                                    <span className="text-[11px] text-muted-foreground truncate block">{subscription.plan.name}</span>
                                  )}
                                </div>
                                <ChevronUp className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${popoverOpen ? '' : 'rotate-180'}`} />
                              </>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      {isCollapsed && !isMobile && !popoverOpen && (
                        <TooltipContent side="right">
                          <p className="font-medium">{currentTeam?.name || "Equipe"}</p>
                          {subscription?.plan?.name && (
                            <p className="text-xs text-muted-foreground">{subscription.plan.name}</p>
                          )}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent 
                    side="top" 
                    align={isCollapsed && !isMobile ? "center" : "start"}
                    sideOffset={8} 
                    className="min-w-56 rounded-xl shadow-xl border border-border bg-white dark:bg-zinc-900 backdrop-blur-md animate-slide-up-fade p-2"
                  >
                    {/* Header with icon and info */}
                    <div className="flex items-center gap-3 p-3 mb-1 rounded-lg bg-gray-100 dark:bg-zinc-800">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center ring-2 ring-primary/20 shadow-sm">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{currentTeam?.name || "Equipe"}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Gerenciamento</span>
                      </div>
                    </div>
                    
                    <DropdownMenuSeparator className="my-2" />
                    
                    {/* Menu items with icons */}
                    <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                      <NavLink 
                        to="/team-demands" 
                        onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} 
                        className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 w-full" 
                        activeClassName="bg-gray-100 dark:bg-zinc-800 text-primary font-medium"
                      >
                        <Layers className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Visão Geral</span>
                      </NavLink>
                    </DropdownMenuItem>
                    
                    
                    <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                      <NavLink 
                        to="/boards" 
                        onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} 
                        className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 w-full" 
                        activeClassName="bg-gray-100 dark:bg-zinc-800 text-primary font-medium"
                      >
                        <LayoutGrid className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Meus Quadros</span>
                      </NavLink>
                    </DropdownMenuItem>
                    
                    {selectedTeamId && (
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <NavLink 
                          to={`/teams/${selectedTeamId}`} 
                          end 
                          onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} 
                          className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 w-full" 
                          activeClassName="bg-gray-100 dark:bg-zinc-800 text-primary font-medium"
                        >
                          <UsersRound className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-200">Participantes</span>
                        </NavLink>
                      </DropdownMenuItem>
                    )}
                    
                    {isTeamAdminOrModerator && selectedTeamId && (
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <NavLink 
                          to={`/teams/${selectedTeamId}/services`} 
                          onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} 
                          className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 w-full" 
                          activeClassName="bg-gray-100 dark:bg-zinc-800 text-primary font-medium"
                        >
                          <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-200">Serviços</span>
                        </NavLink>
                      </DropdownMenuItem>
                    )}
                    
                    {isTeamAdminOrModerator && selectedTeamId && (
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <NavLink 
                          to={`/teams/${selectedTeamId}/requests`} 
                          onClick={() => { setPopoverOpen(false); closeMobileSidebar(); }} 
                          className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 w-full" 
                          activeClassName="bg-gray-100 dark:bg-zinc-800 text-primary font-medium"
                        >
                          <UserPlus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-200">Solicitações</span>
                          {typeof pendingJoinRequests === "number" && pendingJoinRequests > 0 && (
                            <Badge variant="destructive" className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs">
                              {pendingJoinRequests}
                            </Badge>
                          )}
                        </NavLink>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription Card - Below Teams section */}
        <SidebarGroup className="pt-1">
          <SidebarGroupContent>
            <SidebarSubscriptionCard />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer section with sync indicator only */}
        <SidebarGroup className="pb-3 md:pb-2 pt-2">
          <SidebarGroupContent>
            <SidebarSyncIndicator isCollapsed={isCollapsed && !isMobile} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
