import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateDemand, useDemandStatuses } from "@/hooks/useDemands";

interface Demand {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status_id: string;
  demand_statuses?: { name: string; color: string } | null;
  assigned_profile?: { full_name: string; avatar_url?: string | null } | null;
  teams?: { name: string } | null;
}

interface KanbanBoardProps {
  demands: Demand[];
  onDemandClick: (id: string) => void;
  readOnly?: boolean;
}

const priorityColors: Record<string, string> = {
  baixa: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  média: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  alta: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const columns = [
  { key: "A Iniciar", label: "A Iniciar", color: "bg-muted" },
  { key: "Fazendo", label: "Fazendo", color: "bg-blue-500/10" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10" },
];

export function KanbanBoard({ demands, onDemandClick, readOnly = false }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();

  const handleDragStart = (e: React.DragEvent, demandId: string) => {
    if (readOnly) return;
    setDraggedId(demandId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (!draggedId || !statuses) return;

    const targetStatus = statuses.find((s) => s.name === columnKey);
    if (!targetStatus) return;

    const demand = demands.find((d) => d.id === draggedId);
    if (demand?.demand_statuses?.name === columnKey) {
      setDraggedId(null);
      return;
    }

    updateDemand.mutate({
      id: draggedId,
      status_id: targetStatus.id,
    });

    setDraggedId(null);
  };

  const getDemandsForColumn = (columnKey: string) => {
    return demands.filter((d) => d.demand_statuses?.name === columnKey);
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[600px]">
      {columns.map((column) => (
        <div
          key={column.key}
          className={cn(
            "rounded-lg p-4 transition-colors",
            column.color,
            draggedId && "ring-2 ring-primary/20"
          )}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.key)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {column.label}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {getDemandsForColumn(column.key).length}
            </Badge>
          </div>

          <div className="space-y-3">
            {getDemandsForColumn(column.key).map((demand) => (
              <Card
                key={demand.id}
                draggable={!readOnly}
                onDragStart={(e) => handleDragStart(e, demand.id)}
                onClick={() => onDemandClick(demand.id)}
                className={cn(
                  "hover:shadow-md transition-all",
                  !readOnly && "cursor-grab active:cursor-grabbing",
                  readOnly && "cursor-pointer",
                  draggedId === demand.id && "opacity-50 scale-95",
                  "group"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-2">
                        {demand.title}
                      </h4>

                      {demand.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {demand.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {demand.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              priorityColors[demand.priority] ||
                                "bg-muted text-muted-foreground"
                            )}
                          >
                            {demand.priority}
                          </Badge>
                        )}

                        {demand.teams?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {demand.teams.name}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {demand.due_date && (
                          <div
                            className={cn(
                              "flex items-center gap-1 text-xs",
                              isOverdue(demand.due_date) &&
                                column.key !== "Entregue"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {isOverdue(demand.due_date) &&
                            column.key !== "Entregue" ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <Calendar className="h-3 w-3" />
                            )}
                            {format(new Date(demand.due_date), "dd MMM", {
                              locale: ptBR,
                            })}
                          </div>
                        )}

                        {demand.assigned_profile && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={
                                demand.assigned_profile.avatar_url || undefined
                              }
                            />
                            <AvatarFallback className="text-xs">
                              {demand.assigned_profile.full_name
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {getDemandsForColumn(column.key).length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                Arraste demandas aqui
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
