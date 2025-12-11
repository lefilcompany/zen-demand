import { useNavigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useDemands, useDemandStatuses } from "@/hooks/useDemands";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";

export default function Adjustments() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands, isLoading } = useDemands(selectedTeamId || undefined);
  const { data: statuses } = useDemandStatuses();

  const adjustmentStatusId = useMemo(() => {
    return statuses?.find((s) => s.name === "Em Ajuste")?.id;
  }, [statuses]);

  const adjustmentDemands = useMemo(() => {
    if (!demands || !adjustmentStatusId) return [];
    return demands.filter(
      (d) => d.status_id === adjustmentStatusId && !d.archived
    );
  }, [demands, adjustmentStatusId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Ajustes</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Wrench className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Ajustes</h1>
      </div>
      <p className="text-muted-foreground">
        Demandas que foram entregues e o cliente solicitou ajuste
      </p>

      {adjustmentDemands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma demanda em ajuste no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adjustmentDemands.map((demand) => (
            <Card
              key={demand.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/demands/${demand.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {demand.title}
                  </CardTitle>
                  <Badge
                    style={{
                      backgroundColor: `${demand.demand_statuses?.color}20`,
                      color: demand.demand_statuses?.color,
                      borderColor: `${demand.demand_statuses?.color}40`,
                    }}
                    className="shrink-0"
                  >
                    {demand.demand_statuses?.name}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {demand.description || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {demand.due_date
                      ? format(new Date(demand.due_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "Sem prazo"}
                  </div>
                  {demand.demand_assignees && demand.demand_assignees.length > 0 && (
                    <AssigneeAvatars
                      assignees={demand.demand_assignees.map((a: any) => ({
                        user_id: a.user_id,
                        profile: a.profiles,
                      }))}
                      size="sm"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
