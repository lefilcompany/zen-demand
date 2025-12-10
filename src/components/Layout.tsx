import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TeamSelector } from "@/components/TeamSelector";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sidebar">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
