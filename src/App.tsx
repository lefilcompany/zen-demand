import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/contexts/TeamContext";
import { RequireTeam } from "@/components/RequireTeam";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Toaster } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import TeamRequests from "./pages/TeamRequests";
import ServicesManagement from "./pages/ServicesManagement";
import Demands from "./pages/Demands";
import CreateDemand from "./pages/CreateDemand";
import DemandDetail from "./pages/DemandDetail";
import Kanban from "./pages/Kanban";
import ArchivedDemands from "./pages/ArchivedDemands";
import ClientDashboard from "./pages/ClientDashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <TeamProvider>
              <Toaster position="top-right" richColors />
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/teams/create" element={<CreateTeam />} />
                <Route path="/teams/join" element={<JoinTeam />} />
                
                {/* Protected routes - require team selection, shared layout */}
                <Route element={<RequireTeam><ProtectedLayout /></RequireTeam>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/teams/:id" element={<TeamDetail />} />
                  <Route path="/teams/:id/requests" element={<TeamRequests />} />
                  <Route path="/teams/:id/services" element={<ServicesManagement />} />
                  <Route path="/demands" element={<Demands />} />
                  <Route path="/demands/create" element={<CreateDemand />} />
                  <Route path="/demands/:id" element={<DemandDetail />} />
                  <Route path="/kanban" element={<Kanban />} />
                  <Route path="/archived" element={<ArchivedDemands />} />
                  <Route path="/client-dashboard" element={<ClientDashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TeamProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
