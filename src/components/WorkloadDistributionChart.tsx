import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";

interface Demand {
  id: string;
  assigned_to: string | null;
  demand_statuses: {
    name: string;
  } | null;
  demand_assignees?: {
    user_id: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }[];
}

interface WorkloadDistributionChartProps {
  demands: Demand[];
}

interface MemberWorkload {
  id: string;
  name: string;
  avatar: string | null;
  total: number;
  inProgress: number;
  delivered: number;
}

export function WorkloadDistributionChart({ demands }: WorkloadDistributionChartProps) {
  // Calculate workload per member
  const workloadMap = new Map<string, MemberWorkload>();

  demands.forEach((demand) => {
    const assignees = demand.demand_assignees || [];
    
    assignees.forEach((assignee) => {
      if (!assignee.profile) return;
      
      const id = assignee.user_id;
      const { full_name, avatar_url } = assignee.profile;
      
      if (!workloadMap.has(id)) {
        workloadMap.set(id, {
          id,
          name: full_name,
          avatar: avatar_url,
          total: 0,
          inProgress: 0,
          delivered: 0,
        });
      }
      
      const member = workloadMap.get(id)!;
      member.total += 1;
      
      const statusName = demand.demand_statuses?.name?.toLowerCase() || "";
      if (statusName === "entregue") {
        member.delivered += 1;
      } else if (statusName !== "a iniciar") {
        member.inProgress += 1;
      }
    });
  });

  const workloadData = Array.from(workloadMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6); // Top 6 members

  const maxTotal = Math.max(...workloadData.map((m) => m.total), 1);

  if (workloadData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Carga de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum membro com demandas atribuídas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Carga de Trabalho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workloadData.map((member) => {
          const progressPercent = (member.total / maxTotal) * 100;
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={member.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{member.total} demandas</span>
                    <span>•</span>
                    <span className="text-emerald-600">{member.delivered} entregues</span>
                    <span>•</span>
                    <span className="text-amber-600">{member.inProgress} em andamento</span>
                  </div>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
