import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/contexts/TeamContext";
import { RequireTeam } from "@/components/RequireTeam";
import { Toaster } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import ServicesManagement from "./pages/ServicesManagement";
import Demands from "./pages/Demands";
import CreateDemand from "./pages/CreateDemand";
import DemandDetail from "./pages/DemandDetail";
import Kanban from "./pages/Kanban";
import ArchivedDemands from "./pages/ArchivedDemands";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
              
              {/* Protected routes - require team selection */}
              <Route path="/" element={<RequireTeam><Index /></RequireTeam>} />
              <Route path="/teams" element={<RequireTeam><Teams /></RequireTeam>} />
              <Route path="/teams/:id" element={<RequireTeam><TeamDetail /></RequireTeam>} />
              <Route path="/teams/:id/services" element={<RequireTeam><ServicesManagement /></RequireTeam>} />
              <Route path="/demands" element={<RequireTeam><Demands /></RequireTeam>} />
              <Route path="/demands/create" element={<RequireTeam><CreateDemand /></RequireTeam>} />
              <Route path="/demands/:id" element={<RequireTeam><DemandDetail /></RequireTeam>} />
              <Route path="/kanban" element={<RequireTeam><Kanban /></RequireTeam>} />
              <Route path="/archived" element={<RequireTeam><ArchivedDemands /></RequireTeam>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
