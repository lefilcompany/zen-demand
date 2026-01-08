import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/contexts/TeamContext";
import { BoardProvider } from "@/contexts/BoardContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireTeam } from "@/components/RequireTeam";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Toaster } from "@/components/ui/sonner";
import { CommandMenu } from "@/components/CommandMenu";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcuts";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { SwipeNavigationProvider } from "@/components/SwipeNavigationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import TeamRequests from "./pages/TeamRequests";
import ServicesManagement from "./pages/ServicesManagement";
import Demands from "./pages/Demands";
import CreateDemand from "./pages/CreateDemand";
import CreateDemandRequest from "./pages/CreateDemandRequest";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import MyDemandRequests from "./pages/MyDemandRequests";
import DemandRequests from "./pages/DemandRequests";
import DemandDetail from "./pages/DemandDetail";
import Kanban from "./pages/Kanban";
import ArchivedDemands from "./pages/ArchivedDemands";
import MyDemands from "./pages/MyDemands";
import BoardMembers from "./pages/BoardMembers";
import Boards from "./pages/Boards";
import BoardDetail from "./pages/BoardDetail";
import TeamConfig from "./pages/TeamConfig";

import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import TimeManagement from "./pages/TimeManagement";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <PresenceProvider>
              <TeamProvider>
                <BoardProvider>
                  <KeyboardShortcutsProvider>
                    <SwipeNavigationProvider>
                      <Toaster position="top-right" richColors />
                      <CommandMenu />
                      <PWAInstallPrompt />
                      <Routes>
                        {/* Public routes */}
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* Auth-only routes (no team required) */}
                        <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
                        <Route path="/teams/create" element={<RequireAuth><CreateTeam /></RequireAuth>} />
                        <Route path="/teams/join" element={<RequireAuth><JoinTeam /></RequireAuth>} />
                        
                        {/* Protected routes - require team selection, shared layout */}
                        <Route element={<RequireTeam><ProtectedLayout /></RequireTeam>}>
                          <Route path="/" element={<Index />} />
                          <Route path="/teams" element={<Teams />} />
                          <Route path="/teams/:id" element={<TeamDetail />} />
                          <Route path="/teams/:id/requests" element={<TeamRequests />} />
                          <Route path="/teams/:id/services" element={<ServicesManagement />} />
                          <Route path="/boards" element={<Boards />} />
                          <Route path="/boards/:boardId" element={<BoardDetail />} />
                          <Route path="/boards/:boardId/members" element={<BoardMembers />} />
                          <Route path="/team-config" element={<TeamConfig />} />
                          <Route path="/demands" element={<Demands />} />
                          <Route path="/demands/create" element={<CreateDemand />} />
                          <Route path="/demands/request" element={<CreateDemandRequest />} />
                          <Route path="/demands/:id" element={<DemandDetail />} />
                          <Route path="/my-requests" element={<MyDemandRequests />} />
                          <Route path="/demand-requests" element={<DemandRequests />} />
                          <Route path="/kanban" element={<Kanban />} />
                          <Route path="/archived" element={<ArchivedDemands />} />
                          <Route path="/my-demands" element={<MyDemands />} />
                          <Route path="/time-management" element={<TimeManagement />} />
                          <Route path="/user/:userId" element={<UserProfile />} />
                          
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/settings" element={<Settings />} />
                        </Route>
                        
                        {/* Catch-all */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </SwipeNavigationProvider>
                  </KeyboardShortcutsProvider>
                </BoardProvider>
              </TeamProvider>
            </PresenceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
