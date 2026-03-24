import { Plus } from "lucide-react";
import { useCreateDemandModal } from "@/contexts/CreateDemandContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TopbarCreateButton() {
  const { openCreateDemand } = useCreateDemandModal();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId } = useSelectedBoardSafe();
  const { data: bRole } = useBoardRole(selectedBoardId);
  const navigate = useNavigate();

  if (!selectedTeamId) return null;

  const handleClick = bRole === "requester" ? () => navigate("/demands/request") : openCreateDemand;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs font-medium hidden sm:flex"
          onClick={handleClick}
          aria-label="Nova Demanda"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Demanda
        </Button>
        <Button
          variant="default"
          size="icon"
          className="h-7 w-7 shrink-0 sm:hidden"
          onClick={handleClick}
          aria-label="Nova Demanda"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </Button>
      <TooltipContent side="bottom">
        <p>Nova Demanda</p>
      </TooltipContent>
    </Tooltip>
  );
}
