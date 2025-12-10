import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/contexts/TeamContext";
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
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/teams/:id/services" element={<ServicesManagement />} />
            <Route path="/teams/create" element={<CreateTeam />} />
            <Route path="/teams/join" element={<JoinTeam />} />
            <Route path="/demands" element={<Demands />} />
            <Route path="/demands/create" element={<CreateDemand />} />
            <Route path="/demands/:id" element={<DemandDetail />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/archived" element={<ArchivedDemands />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
