import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemandCard } from "@/components/DemandCard";
import { useDemands } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useAuth } from "@/lib/auth";
import { Plus, Briefcase, LayoutGrid, List, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { demandColumns, DemandTableRow } from "@/components/demands/columns";

type ViewMode = "table" | "grid";

export default function Demands() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands, isLoading } = useDemands(selectedTeamId || undefined);
  const { data: role } = useTeamRole(selectedTeamId);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const isReadOnly = role === "requester";
  
  // Filter demands by search query
  const filteredDemands = useMemo(() => {
    if (!demands) return [];
    if (!searchQuery.trim()) return demands;
    
    const query = searchQuery.toLowerCase();
    return demands.filter((d) =>
      d.title.toLowerCase().includes(query) ||
      d.description?.toLowerCase().includes(query) ||
      d.priority?.toLowerCase().includes(query)
    );
  }, [demands, searchQuery]);
  
  const myDemands = filteredDemands.filter((d) => d.assigned_to === user?.id);
  const createdByMe = filteredDemands.filter((d) => d.created_by === user?.id);

  const renderDemandList = (demandList: typeof filteredDemands) => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-4">Carregando demandas...</p>
        </div>
      );
    }

    if (demandList.length === 0) {
      if (searchQuery) {
        return (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Nenhum resultado encontrado
            </h3>
            <p className="text-muted-foreground mt-2">
              Tente buscar por outro termo
            </p>
          </div>
        );
      }
      return (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Nenhuma demanda encontrada
          </h3>
          <p className="text-muted-foreground mt-2">
            {isReadOnly
              ? "Não há demandas nesta equipe"
              : "Comece criando uma nova demanda"}
          </p>
          {!isReadOnly && (
            <div className="mt-6">
              <Button onClick={() => navigate("/demands/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Demanda
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (viewMode === "table") {
      return <DataTable columns={demandColumns} data={demandList as unknown as DemandTableRow[]} />;
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demandList.map((demand) => (
          <DemandCard
            key={demand.id}
            demand={demand}
            onClick={() => navigate(`/demands/${demand.id}`)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Demandas</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isReadOnly
              ? "Visualize as demandas da sua equipe"
              : "Gerencie todas as demandas das suas equipes"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar demandas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[200px] md:w-[250px]"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className={viewMode === "table" ? "rounded-r-none bg-primary text-primary-foreground" : "rounded-r-none"}
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className={viewMode === "grid" ? "rounded-l-none bg-primary text-primary-foreground" : "rounded-l-none"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => navigate("/demands/create")} className="shadow-primary flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nova Demanda</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>
      </div>

      {!selectedTeamId ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Selecione uma equipe
          </h3>
          <p className="text-muted-foreground mt-2">
            Use o seletor no menu superior para escolher uma equipe
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm">Todas</TabsTrigger>
            <TabsTrigger value="mine" className="text-xs sm:text-sm">Atribuídas</TabsTrigger>
            <TabsTrigger value="created" className="text-xs sm:text-sm">Criadas</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {renderDemandList(filteredDemands)}
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            {renderDemandList(myDemands)}
          </TabsContent>

          <TabsContent value="created" className="space-y-4">
            {renderDemandList(createdByMe)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
