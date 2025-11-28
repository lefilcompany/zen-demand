import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { DemandCard } from "@/components/DemandCard";
import { useDemands } from "@/hooks/useDemands";
import { Plus, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Demands() {
  const navigate = useNavigate();
  const { data: demands, isLoading } = useDemands();

  const myDemands = demands?.filter(
    (d) => d.assigned_to === (d.assigned_profile as any)?.id
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Demandas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as demandas das suas equipes
            </p>
          </div>
          <Button onClick={() => navigate("/demands/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Demanda
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="mine">Minhas Demandas</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando demandas...</p>
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
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
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
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando demandas...</p>
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
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Nenhuma demanda atribuída
                </h3>
                <p className="text-muted-foreground mt-2">
                  Você não possui demandas atribuídas no momento
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
