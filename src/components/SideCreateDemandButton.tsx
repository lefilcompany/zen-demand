import { Plus } from "lucide-react";
import { useCreateDemandModal } from "@/contexts/CreateDemandContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function SideCreateDemandButton() {
  const { openCreateDemand } = useCreateDemandModal();
  const { selectedTeamId } = useSelectedTeam();
  const isMobile = useIsMobile();

  if (isMobile || !selectedTeamId) return null;

  return (
    <button
      onClick={openCreateDemand}
      className="fixed right-6 bottom-6 z-40 group flex items-center gap-2 
        bg-primary text-primary-foreground rounded-full shadow-lg
        pl-3 pr-3 py-3 
        hover:pr-5 hover:rounded-lg
        transition-all duration-300 ease-in-out overflow-hidden cursor-pointer"
      aria-label="Criar nova demanda"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Nova Demanda
      </span>
    </button>
  );
}
