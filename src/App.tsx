import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/contexts/TeamContext";
import { BoardProvider } from "@/contexts/BoardContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { CreateDemandProvider, useCreateDemandModal } from "@/contexts/CreateDemandContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireTeam } from "@/components/RequireTeam";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Toaster } from "@/components/ui/sonner";
import { CommandMenu } from "@/components/CommandMenu";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcuts";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { SwipeNavigationProvider } from "@/components/SwipeNavigationProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { UpdateModal } from "@/components/UpdateModal";
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
import DemandRequests from "./pages/DemandRequests";
import DemandDetail from "./pages/DemandDetail";
import SharedDemand from "./pages/SharedDemand";
import SharedNote from "./pages/SharedNote";
import SharedBoardSummary from "./pages/SharedBoardSummary";
import Kanban from "./pages/Kanban";
import ArchivedDemands from "./pages/ArchivedDemands";
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
import BoardSummary from "./pages/BoardSummary";
import Store from "./pages/Store";
import TeamDemands from "./pages/TeamDemands";
import MyDemands from "./pages/MyDemands";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import FolderDetail from "./pages/FolderDetail";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import GetStarted from "./pages/GetStarted";
import CompleteProfile from "./pages/CompleteProfile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminProfile from "./pages/admin/AdminProfile";
import { useEffect } from "react";

function CreateDemandGlobal() {
  return <CreateDemand />;
}

function CreateDemandRoute() {
  const { openCreateDemand } = useCreateDemandModal();
  const navigate = useNavigate();

  useEffect(() => {
    openCreateDemand();
    navigate(-1);
  }, []);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const App = () => (
  <HelmetProvider>
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <div className="flex h-[100dvh] flex-col">
            <UpdateModal />
            <div className="flex min-h-0 flex-1 flex-col">
              <ScrollToTop />
              <AuthProvider>
                <PresenceProvider>
                  <TeamProvider>
                    <BoardProvider>
                      <CreateDemandProvider>
                        <KeyboardShortcutsProvider>
                          <SwipeNavigationProvider>
                            <Toaster position="top-right" richColors />
                            <CommandMenu />
                            <PWAInstallPrompt />
                            <CreateDemandGlobal />
                            <Routes>
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/get-started" element={<GetStarted />} />
                              <Route path="/shared/:token" element={<SharedDemand />} />
                              <Route path="/shared/note/:token" element={<SharedNote />} />
                              <Route path="/shared/summary/:token" element={<SharedBoardSummary />} />
                              <Route path="/reset-password" element={<ResetPassword />} />
                              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                              <Route path="/terms-of-service" element={<TermsOfService />} />

                              <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
                                <Route index element={<AdminDashboard />} />
                                <Route path="plans" element={<AdminPlans />} />
                                <Route path="coupons" element={<AdminCoupons />} />
                                <Route path="teams" element={<AdminTeams />} />
                                <Route path="users" element={<AdminUsers />} />
                                <Route path="profile" element={<AdminProfile />} />
                              </Route>

                              <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
                              <Route path="/complete-profile" element={<RequireAuth><CompleteProfile /></RequireAuth>} />
                              <Route path="/teams/create" element={<RequireAuth><CreateTeam /></RequireAuth>} />
                              <Route path="/teams/join" element={<RequireAuth><JoinTeam /></RequireAuth>} />
                              <Route path="/subscription/success" element={<RequireAuth><SubscriptionSuccess /></RequireAuth>} />

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
                                <Route path="/folders/:folderId" element={<FolderDetail />} />
                                <Route path="/demands/create" element={<CreateDemandRoute />} />
                                <Route path="/demands/request" element={<CreateDemandRequest />} />
                                <Route path="/demands/:id" element={<DemandDetail />} />
                                <Route path="/demand-requests" element={<DemandRequests />} />
                                <Route path="/store" element={<Store />} />
                                <Route path="/kanban" element={<Kanban />} />
                                <Route path="/time-management" element={<TimeManagement />} />
                                <Route path="/board-summary" element={<BoardSummary />} />
                                <Route path="/user/:userId" element={<UserProfile />} />
                                <Route path="/team-demands" element={<TeamDemands />} />
                                <Route path="/my-demands" element={<MyDemands />} />
                                <Route path="/notes" element={<Notes />} />
                                <Route path="/notes/:noteId" element={<NoteDetail />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/pricing" element={<Pricing />} />
                              </Route>

                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </SwipeNavigationProvider>
                        </KeyboardShortcutsProvider>
                      </CreateDemandProvider>
                    </BoardProvider>
                  </TeamProvider>
                </PresenceProvider>
              </AuthProvider>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
);

export default App;
