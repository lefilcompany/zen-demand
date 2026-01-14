import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BoardSelector } from "@/components/BoardSelector";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { Outlet, useNavigate } from "react-router-dom";
import { Settings, RotateCcw, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloatingCreateButton } from "@/components/FloatingCreateButton";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useDataPrecache } from "@/hooks/useDataPrecache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

export function ProtectedLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const {
    isOpen,
    steps,
    closeTour,
    completeOnboarding,
    resetOnboarding,
    hasCompleted
  } = useOnboarding();
  const { currentTeam } = useSelectedTeam();
  
  // Initialize data precaching for offline support
  useDataPrecache();

  // Detect if tablet/medium screen to collapse sidebar by default
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      return width >= 768 && width < 1280;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  // Sidebar starts collapsed on tablet, open on desktop
  const defaultSidebarOpen = !isTablet;

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} key={isTablet ? 'tablet' : 'desktop'}>
      <div className="flex h-screen w-full bg-sidebar p-2 md:p-3 overflow-hidden safe-all">
        <AppSidebar />
        <main className="flex-1 flex flex-col bg-background rounded-xl shadow-xl min-h-0 overflow-hidden">
          <header className="flex h-12 sm:h-14 md:h-16 shrink-0 items-center justify-between gap-1 sm:gap-2 bg-background px-2 sm:px-3 md:px-6 border-b border-border rounded-t-xl overflow-visible">
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0">
              <SidebarTrigger className="text-foreground hover:bg-muted shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />
              {currentTeam && (
                <div className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate max-w-[100px] xl:max-w-[150px]">{currentTeam.name}</span>
                </div>
              )}
              <div className="h-5 w-px bg-border hidden lg:block" />
              <div className="hidden md:block">
                <BoardSelector />
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-1.5 md:gap-2 flex-1 justify-end">
              <div className="flex-1 min-w-0 max-w-md hidden sm:block">
                <GlobalSearchBar />
              </div>
              <div className="h-5 w-px bg-border hidden sm:block" />
              {/* Theme Toggle - Hidden on very small screens */}
              <div className="hidden xs:block">
                <ThemeToggle />
              </div>

              {/* Notifications */}
              <div data-tour="notifications-btn">
                <NotificationDropdown />
              </div>

              {/* Settings - Hidden on mobile */}
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 md:h-9 md:w-9 rounded-full">
                    <Avatar className="h-8 w-8 md:h-9 md:w-9">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Perfil"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border bg-popover/95 backdrop-blur-sm animate-slide-up-fade">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{profile?.full_name || "Usuário"}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    Meu Perfil
                  </DropdownMenuItem>
                  {hasCompleted && (
                    <DropdownMenuItem onClick={() => resetOnboarding(() => navigate("/"))}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rever Tour Guiado
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLogoutDialogOpen(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("auth.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <Outlet />
          </div>
          <FloatingCreateButton />
        </main>
      </div>
      
      {/* Onboarding Tour */}
      <OnboardingTour steps={steps} isOpen={isOpen} onClose={closeTour} onComplete={completeOnboarding} />

      {/* Logout confirmation dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("auth.logoutConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("auth.logoutDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                await signOut();
                setLogoutDialogOpen(false);
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("auth.logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
