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
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleClick}
          aria-label="Nova Demanda"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Nova Demanda</p>
      </TooltipContent>
    </Tooltip>
  );
}
