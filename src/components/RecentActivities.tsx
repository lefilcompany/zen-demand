import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, FileText, MessageSquare, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DemandInteraction {
  id: string;
  demand_id: string;
  interaction_type: string;
  content: string | null;
  created_at: string;
  demands: {
    id: string;
    title: string;
  };
  profiles: {
    full_name: string;
  };
}

export function RecentActivities() {
  const { selectedTeamId } = useSelectedTeam();
  const navigate = useNavigate();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["recent-activities", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      
      const { data, error } = await supabase
        .from("demand_interactions")
        .select(`
          id,
          demand_id,
          interaction_type,
          content,
          created_at,
          demands!inner(id, title, team_id),
          profiles:user_id(full_name)
        `)
        .eq("demands.team_id", selectedTeamId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as unknown as DemandInteraction[];
    },
    enabled: !!selectedTeamId,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "status_change":
        return <RefreshCw className="h-4 w-4 text-warning" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: DemandInteraction) => {
    const userName = activity.profiles?.full_name || "Usuário";
    switch (activity.interaction_type) {
      case "comment":
        return `${userName} comentou`;
      case "status_change":
        return `${userName} alterou o status`;
      case "created":
        return `${userName} criou a demanda`;
      default:
        return `${userName} atualizou`;
    }
  };

  if (!selectedTeamId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
        <CardDescription>Últimas atualizações nas demandas</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activities && activities.length > 0 ? (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/demands/${activity.demand_id}`)}
                >
                  <div className="mt-0.5">{getActivityIcon(activity.interaction_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.demands?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getActivityText(activity)}
                    </p>
                    {activity.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        "{activity.content}"
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade recente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
