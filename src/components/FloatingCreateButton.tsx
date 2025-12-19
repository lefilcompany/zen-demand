import { useTranslation } from "react-i18next";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreateBoardDialog } from "@/components/CreateBoardDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FloatingCreateButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTeamId } = useSelectedTeam();
  const { data: role } = useTeamRole(selectedTeamId);
  const isMobile = useIsMobile();

  if (!isMobile || !selectedTeamId) return null;

  const isOnBoardsPage = location.pathname === "/boards";
  const canCreateBoard = role === "admin" || role === "moderator" || role === "executor";

  // On boards page, show create board button
  if (isOnBoardsPage && canCreateBoard) {
    return (
      <CreateBoardDialog
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg animate-scale-in"
                size="icon"
              >
                <LayoutGrid className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Novo Quadro
            </TooltipContent>
          </Tooltip>
        }
      />
    );
  }

  // On other pages, show create demand button (but not on boards page)
  if (isOnBoardsPage) return null;

  const targetUrl = role === "requester" ? "/demands/request" : "/demands/create";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={() => navigate(targetUrl)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg animate-scale-in"
          size="icon"
          data-tour="new-demand-btn"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {t("demands.newDemand")}
      </TooltipContent>
    </Tooltip>
  );
}
