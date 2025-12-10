import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TeamSelector } from "@/components/TeamSelector";
import { Outlet } from "react-router-dom";

export function ProtectedLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-sidebar py-1 pr-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col bg-background rounded-xl shadow-xl overflow-hidden">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 bg-background px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground hover:bg-muted" />
            </div>
            <TeamSelector />
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
