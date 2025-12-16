import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TeamSelector } from "@/components/TeamSelector";
import { BoardSelector } from "@/components/BoardSelector";
import { Outlet, useNavigate } from "react-router-dom";
import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloatingCreateButton } from "@/components/FloatingCreateButton";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";

export function ProtectedLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOpen, steps, closeTour, completeOnboarding, resetOnboarding, hasCompleted } = useOnboarding();
  
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
    enabled: !!user?.id,
  });

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  // Sidebar starts collapsed on tablet, open on desktop
  const defaultSidebarOpen = !isTablet;

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} key={isTablet ? 'tablet' : 'desktop'}>
      <div className="flex h-screen w-full bg-sidebar p-2 md:p-3 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col bg-background rounded-xl shadow-xl min-h-0 overflow-hidden">
          <header className="flex h-14 md:h-16 shrink-0 items-center justify-between gap-2 bg-background px-3 md:px-6 border-b border-border rounded-t-xl">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <SidebarTrigger className="text-foreground hover:bg-muted shrink-0" />
              <div className="min-w-0 flex-1 flex items-center gap-2 md:gap-4 max-w-[500px] md:max-w-none">
                <TeamSelector />
                <div className="hidden sm:block h-6 w-px bg-border" />
                <div className="hidden sm:block">
                  <BoardSelector />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <div data-tour="notifications-btn">
                <NotificationDropdown />
              </div>

              {/* Settings - Hidden on mobile */}
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="hidden sm:flex">
                <Settings className="h-5 w-5" />
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
                <DropdownMenuContent align="end" className="w-56">
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
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Configurações
                  </DropdownMenuItem>
                  {hasCompleted && (
                    <DropdownMenuItem onClick={() => resetOnboarding(() => navigate("/"))}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rever Tour Guiado
                    </DropdownMenuItem>
                  )}
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
      <OnboardingTour
        steps={steps}
        isOpen={isOpen}
        onClose={closeTour}
        onComplete={completeOnboarding}
      />
    </SidebarProvider>
  );
}
