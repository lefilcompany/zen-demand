import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useDemands } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function Kanban() {
  const navigate = useNavigate();
  const {
    selectedTeamId
  } = useSelectedTeam();
  const {
    data: demands,
    isLoading
  } = useDemands(selectedTeamId || undefined);
  const {
    data: role
  } = useTeamRole(selectedTeamId);

  // Requesters can only view, not edit
  const isReadOnly = role === "requester";
  return <div className="flex flex-col h-full animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between shrink-0 pb-4 md:pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Kanban</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isReadOnly ? "Visualize o progresso das demandas" : "Visualize e gerencie o progresso das demandas"}
          </p>
        </div>

        <Button onClick={() => navigate("/demands/create")} className="shadow-primary w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="sm:hidden">Nova</span>
          <span className="hidden sm:inline">Nova Demanda</span>
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {!selectedTeamId ? <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Selecione uma equipe
            </h3>
            <p className="text-muted-foreground mt-2">
              Use o seletor no menu superior para escolher uma equipe
            </p>
          </div> : isLoading ? <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-4">Carregando demandas...</p>
          </div> : demands && demands.length > 0 ? <KanbanBoard demands={demands} onDemandClick={id => navigate(`/demands/${id}`)} readOnly={isReadOnly} /> : <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Nenhuma demanda encontrada
            </h3>
            <p className="text-muted-foreground mt-2">
              {isReadOnly ? "Não há demandas nesta equipe" : "Comece criando uma nova demanda"}
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate("/demands/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Demanda
              </Button>
            </div>
          </div>}
      </div>
    </div>;
}