import { useTranslation } from "react-i18next";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreateBoardDialog } from "@/components/CreateBoardDialog";

export function FloatingCreateButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTeamId } = useSelectedTeam();
  const { data: role } = useTeamRole(selectedTeamId);
  const isMobile = useIsMobile();

  if (!isMobile || !selectedTeamId) return null;

  const isOnBoardsPage = location.pathname === "/boards";
  const canCreateBoard = role === "admin" || role === "moderator";

  // On boards page, show create board button
  if (isOnBoardsPage && canCreateBoard) {
    return (
      <CreateBoardDialog
        trigger={
          <Button
            className="fixed z-40 h-12 w-12 rounded-full shadow-lg animate-scale-in pointer-events-auto right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"
            size="icon"
            aria-label="Novo Quadro"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
        }
      />
    );
  }

  // On other pages, show create demand button (but not on boards page)
  if (isOnBoardsPage) return null;

  const targetUrl = role === "requester" ? "/demands/request" : "/demands/create";

  return (
    <Button
      onClick={() => navigate(targetUrl)}
      className="fixed z-40 h-12 w-12 rounded-full shadow-lg animate-scale-in pointer-events-auto right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      size="icon"
      data-tour="new-demand-btn"
      aria-label={t("demands.newDemand")}
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}
