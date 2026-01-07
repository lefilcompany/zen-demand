import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { DemandTimeDisplay } from "@/components/DemandTimeDisplay";
import { cn } from "@/lib/utils";
import { formatDemandCode } from "@/lib/demandCodeUtils";

interface Assignee {
  user_id: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface DemandCardProps {
  demand: {
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    due_date?: string | null;
    created_at?: string;
    updated_at?: string;
    time_in_progress_seconds?: number | null;
    last_started_at?: string | null;
    board_sequence_number?: number | null;
    demand_statuses?: {
      name: string;
      color: string;
    } | null;
    assigned_profile?: {
      full_name: string;
      avatar_url?: string | null;
    } | null;
    teams?: {
      name: string;
    } | null;
    demand_assignees?: Assignee[];
  };
  onClick?: () => void;
  showFullDetails?: boolean;
}

const priorityColors = {
  baixa: "bg-success/10 text-success border-success/20",
  média: "bg-warning/10 text-warning border-warning/20",
  alta: "bg-destructive/10 text-destructive border-destructive/20",
};

export function DemandCard({ demand, onClick, showFullDetails = false }: DemandCardProps) {
  const assignees = demand.demand_assignees || [];
  const isHighPriority = demand.priority === "alta";
  const statusName = demand.demand_statuses?.name;
  const isInProgress = statusName === "Fazendo";
  const isDelivered = statusName === "Entregue";
  
  // Check if due date is overdue
  const isOverdue = demand.due_date && new Date(demand.due_date) < new Date() && statusName !== "Entregue";
  
  // Fallback to assigned_profile if no assignees
  const displayAssignees = assignees.length > 0 
    ? assignees 
    : demand.assigned_profile 
      ? [{ user_id: "legacy", profile: { full_name: demand.assigned_profile.full_name, avatar_url: demand.assigned_profile.avatar_url || null } }]
      : [];

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all cursor-pointer",
        isHighPriority && "border-l-4 border-l-destructive"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {demand.board_sequence_number && (
                <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/20 font-mono shrink-0">
                  {formatDemandCode(demand.board_sequence_number)}
                </Badge>
              )}
              {isHighPriority && (
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
            </div>
            <CardTitle className="text-base sm:text-lg line-clamp-2">{demand.title}</CardTitle>
            {demand.description && (
              <CardDescription className="line-clamp-2 text-sm">
                {demand.description}
              </CardDescription>
            )}
          </div>
          {demand.demand_statuses && (
            <Badge
              className="shrink-0 text-xs"
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
      <CardContent className="space-y-3">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {demand.priority && (
            <Badge
              variant="outline"
              className={cn("text-xs", priorityColors[demand.priority as keyof typeof priorityColors] || "")}
            >
              {demand.priority.charAt(0).toUpperCase() + demand.priority.slice(1)}
            </Badge>
          )}
          {demand.teams?.name && (
            <Badge variant="secondary" className="text-xs">
              {demand.teams.name}
            </Badge>
          )}
        </div>

        {/* Date and Time info */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {demand.due_date && (
            <div className={cn(
              "flex items-center gap-1",
              isOverdue && "text-destructive font-medium"
            )}>
              {isOverdue ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
              <span>
                {format(new Date(demand.due_date), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Execution time - show for in progress or delivered */}
        {showFullDetails && (isInProgress || isDelivered) && (
          <DemandTimeDisplay
            createdAt={demand.created_at}
            updatedAt={demand.updated_at}
            timeInProgressSeconds={demand.time_in_progress_seconds}
            lastStartedAt={demand.last_started_at}
            isInProgress={isInProgress}
            isDelivered={isDelivered}
            variant="card"
          />
        )}

        {/* Assignees row */}
        {displayAssignees.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Responsáveis:</span>
            <AssigneeAvatars assignees={displayAssignees} size="sm" maxVisible={4} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
