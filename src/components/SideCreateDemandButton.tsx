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
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 group flex items-center gap-2 
        bg-primary text-primary-foreground rounded-l-lg shadow-lg
        pl-2 pr-1 py-3 
        w-8 hover:w-auto hover:pr-4
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
