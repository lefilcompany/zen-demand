import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DemandCardProps {
  demand: {
    id: string;
    title: string;
    description?: string;
    priority?: string;
    due_date?: string;
    demand_statuses?: {
      name: string;
      color: string;
    };
    assigned_profile?: {
      full_name: string;
      avatar_url?: string;
    };
    teams?: {
      name: string;
    };
  };
  onClick?: () => void;
}

const priorityColors = {
  baixa: "bg-success/10 text-success border-success/20",
  média: "bg-warning/10 text-warning border-warning/20",
  alta: "bg-destructive/10 text-destructive border-destructive/20",
};

export function DemandCard({ demand, onClick }: DemandCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{demand.title}</CardTitle>
            {demand.description && (
              <CardDescription className="line-clamp-2">
                {demand.description}
              </CardDescription>
            )}
          </div>
          {demand.demand_statuses && (
            <Badge
              className="shrink-0"
              style={{
                backgroundColor: `${demand.demand_statuses.color}20`,
                color: demand.demand_statuses.color,
                borderColor: `${demand.demand_statuses.color}40`,
              }}
            >
              {demand.demand_statuses.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {demand.priority && (
              <Badge
                variant="outline"
                className={priorityColors[demand.priority as keyof typeof priorityColors] || ""}
              >
                {demand.priority}
              </Badge>
            )}
            {demand.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(demand.due_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
          {demand.assigned_profile && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={demand.assigned_profile.avatar_url} />
                <AvatarFallback>
                  {demand.assigned_profile.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {demand.assigned_profile.full_name}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
