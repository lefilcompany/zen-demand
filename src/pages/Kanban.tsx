import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useDemands } from "@/hooks/useDemands";
import { useTeams } from "@/hooks/useTeams";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function Kanban() {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const { data: demands, isLoading } = useDemands(
    selectedTeam !== "all" ? selectedTeam : undefined
  );
  const { data: teams } = useTeams();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie o progresso das demandas
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as equipes</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-r-none"
                onClick={() => navigate("/demands")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => navigate("/demands/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Demanda
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando demandas...</p>
          </div>
        ) : demands && demands.length > 0 ? (
          <KanbanBoard
            demands={demands}
            onDemandClick={(id) => navigate(`/demands/${id}`)}
          />
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              Nenhuma demanda encontrada
            </h3>
            <p className="text-muted-foreground mt-2">
              Comece criando uma nova demanda
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate("/demands/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Demanda
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
