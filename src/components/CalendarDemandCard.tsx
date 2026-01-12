import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDateOverdue } from "@/lib/dateUtils";

interface CalendarDemandCardProps {
  demand: {
    id: string;
    title: string;
    priority?: string | null;
    due_date?: string | null;
    demand_statuses?: {
      name: string;
      color: string;
    } | null;
  };
  onClick?: () => void;
}

const priorityIndicatorColors = {
  baixa: "bg-success",
  média: "bg-warning",
  alta: "bg-destructive",
};

export function CalendarDemandCard({ demand, onClick }: CalendarDemandCardProps) {
  const isHighPriority = demand.priority === "alta";
  const statusName = demand.demand_statuses?.name;
  const isDelivered = statusName === "Entregue";
  const isOverdue = !isDelivered && isDateOverdue(demand.due_date);

  return (
    <div
      className={cn(
        "group relative px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all",
        "hover:ring-1 hover:ring-primary/50 hover:shadow-sm",
        isDelivered && "opacity-60",
        isOverdue && "ring-1 ring-destructive/50 bg-destructive/5",
        !isOverdue && !isDelivered && "bg-muted/50 hover:bg-muted"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Priority indicator */}
      {demand.priority && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-md",
            priorityIndicatorColors[demand.priority as keyof typeof priorityIndicatorColors]
          )}
        />
      )}

      <div className="flex items-start gap-1.5 pl-1">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-foreground" title={demand.title}>
            {demand.title}
          </p>
          {demand.demand_statuses && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-4 mt-0.5"
              style={{
                backgroundColor: `${demand.demand_statuses.color}15`,
                color: demand.demand_statuses.color,
                borderColor: `${demand.demand_statuses.color}30`,
              }}
            >
              {demand.demand_statuses.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isHighPriority && (
            <AlertTriangle className="h-3 w-3 text-destructive" />
          )}
          {isOverdue && (
            <Clock className="h-3 w-3 text-destructive" />
          )}
        </div>
      </div>
    </div>
  );
}
