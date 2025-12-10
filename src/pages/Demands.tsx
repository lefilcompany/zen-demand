import { Button } from "@/components/ui/button";
import { DemandCard } from "@/components/DemandCard";
import { useDemands } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useAuth } from "@/lib/auth";
import { Plus, Briefcase, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Demands() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands, isLoading } = useDemands(selectedTeamId || undefined);
  const { data: role } = useTeamRole(selectedTeamId);

  const isReadOnly = role === "requester";
  
  const myDemands = demands?.filter((d) => d.assigned_to === user?.id);
  const createdByMe = demands?.filter((d) => d.created_by === user?.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Demandas</h1>
          <p className="text-muted-foreground">
            {isReadOnly
              ? "Visualize as demandas da sua equipe"
              : "Gerencie todas as demandas das suas equipes"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-r-none bg-primary text-primary-foreground"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-l-none"
              onClick={() => navigate("/kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => navigate("/demands/create")} className="shadow-primary">
            <Plus className="mr-2 h-4 w-4" />
            Nova Demanda
          </Button>
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
          <TabsList className="bg-muted">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="mine">Atribuídas a Mim</TabsTrigger>
            <TabsTrigger value="created">Criadas por Mim</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-muted-foreground mt-4">Carregando demandas...</p>
              </div>
            ) : demands && demands.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {demands.map((demand) => (
                  <DemandCard
                    key={demand.id}
                    demand={demand}
                    onClick={() => navigate(`/demands/${demand.id}`)}
                  />
                ))}
              </div>
            ) : (
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
                <div className="mt-6">
                  <Button onClick={() => navigate("/demands/create")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Demanda
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              </div>
            ) : myDemands && myDemands.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myDemands.map((demand) => (
                  <DemandCard
                    key={demand.id}
                    demand={demand}
                    onClick={() => navigate(`/demands/${demand.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Nenhuma demanda atribuída
                </h3>
                <p className="text-muted-foreground mt-2">
                  Você não possui demandas atribuídas no momento
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="created" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              </div>
            ) : createdByMe && createdByMe.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {createdByMe.map((demand) => (
                  <DemandCard
                    key={demand.id}
                    demand={demand}
                    onClick={() => navigate(`/demands/${demand.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Nenhuma demanda criada
                </h3>
                <p className="text-muted-foreground mt-2">
                  Você não criou nenhuma demanda ainda
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
