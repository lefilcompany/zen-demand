import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Teams from "./pages/Teams";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import Demands from "./pages/Demands";
import CreateDemand from "./pages/CreateDemand";
import DemandDetail from "./pages/DemandDetail";
import Kanban from "./pages/Kanban";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/create" element={<CreateTeam />} />
            <Route path="/teams/join" element={<JoinTeam />} />
            <Route path="/demands" element={<Demands />} />
            <Route path="/demands/create" element={<CreateDemand />} />
            <Route path="/demands/:id" element={<DemandDetail />} />
            <Route path="/kanban" element={<Kanban />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
