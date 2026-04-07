import { useState } from "react";
import { Plus } from "lucide-react";
import { useCreateDemandModal } from "@/contexts/CreateDemandContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateRequestQuickDialog } from "@/components/CreateRequestQuickDialog";

export function TopbarCreateButton() {
  const { openCreateDemand } = useCreateDemandModal();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId } = useSelectedBoardSafe();
  const { data: bRole } = useBoardRole(selectedBoardId);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  if (!selectedTeamId) return null;

  const isRequester = bRole === "requester";
  const label = isRequester ? "Nova Solicitação" : "Nova Demanda";
  const tooltip = isRequester ? "Criar nova solicitação" : "Criar nova demanda (Ctrl+Shift+D)";

  const handleClick = isRequester ? () => setRequestDialogOpen(true) : openCreateDemand;

  return (
    <>
      {/* Desktop: labeled button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs font-medium hidden sm:inline-flex"
            onClick={handleClick}
            aria-label={label}
          >
            <Plus className="h-3.5 w-3.5" />
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>

      {/* Mobile: icon only */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="h-7 w-7 shrink-0 sm:hidden"
            onClick={handleClick}
            aria-label={label}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>

      {/* Request creation dialog for requesters */}
      {isRequester && (
        <CreateRequestQuickDialog
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          selectedDate={null}
        />
      )}
    </>
  );
}
