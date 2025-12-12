import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, GripVertical, RefreshCw, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errorUtils";
import { useUpdateDemand, useDemandStatuses, useCreateInteraction } from "@/hooks/useDemands";
import { useDemandAssignees } from "@/hooks/useDemandAssignees";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { toast } from "sonner";
import { useAdjustmentCounts } from "@/hooks/useAdjustmentCount";
import { supabase } from "@/integrations/supabase/client";

interface Assignee {
  user_id: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Demand {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  demand_statuses?: { name: string; color: string } | null;
  assigned_profile?: { full_name: string; avatar_url?: string | null } | null;
  teams?: { name: string } | null;
  demand_assignees?: Assignee[];
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
  { key: "Em Ajuste", label: "Em Ajuste", color: "bg-purple-500/10" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10" },
];

export function KanbanBoard({ demands, onDemandClick, readOnly = false }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentDemandId, setAdjustmentDemandId] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();
  const createInteraction = useCreateInteraction();
  
  const demandIds = useMemo(() => demands.map(d => d.id), [demands]);
  const { data: adjustmentCounts } = useAdjustmentCounts(demandIds);
  
  const adjustmentDemand = demands.find(d => d.id === adjustmentDemandId);
  const { data: adjustmentAssignees } = useDemandAssignees(adjustmentDemandId);
  const adjustmentStatusId = statuses?.find((s) => s.name === "Em Ajuste")?.id;

  const handleDragStart = (e: React.DragEvent, demandId: string) => {
    if (readOnly) return;
    setDraggedId(demandId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (!draggedId || !statuses) return;

    const targetStatus = statuses.find((s) => s.name === columnKey);
    if (!targetStatus) return;

    const demand = demands.find((d) => d.id === draggedId);
    const previousStatusName = demand?.demand_statuses?.name;
    
    if (previousStatusName === columnKey) {
      setDraggedId(null);
      return;
    }

    // Check if this is an adjustment completion (Em Ajuste -> Entregue)
    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && columnKey === "Entregue";

    updateDemand.mutate(
      {
        id: draggedId,
        status_id: targetStatus.id,
      },
      {
        onSuccess: async () => {
          toast.success(`Status alterado para "${columnKey}"`);
          
          // Send email notification when adjustment is completed
          if (isAdjustmentCompletion && demand) {
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: demand.created_by,
                  subject: `Ajuste concluído: ${demand.title}`,
                  template: "notification",
                  templateData: {
                    title: "Ajuste Concluído",
                    message: `O ajuste solicitado na demanda "${demand.title}" foi finalizado com sucesso. A demanda voltou para o status Entregue.`,
                    actionUrl: `${window.location.origin}/demands/${demand.id}`,
                    actionText: "Ver Demanda",
                    type: "success",
                  },
                },
              });
              console.log("Email de ajuste concluído enviado");
            } catch (emailError) {
              console.error("Erro ao enviar email de ajuste concluído:", emailError);
            }
          }
        },
        onError: (error: any) => {
          toast.error("Erro ao alterar status", {
            description: getErrorMessage(error),
          });
        },
      }
    );

    setDraggedId(null);
  };

  const getDemandsForColumn = (columnKey: string) => {
    return demands.filter((d) => d.demand_statuses?.name === columnKey);
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatCompletionTime = (createdAt?: string, updatedAt?: string) => {
    if (!createdAt || !updatedAt) return null;
    
    const start = new Date(createdAt).getTime();
    const end = new Date(updatedAt).getTime();
    const diffMs = end - start;
    
    if (diffMs < 0) return null;
    
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleOpenAdjustmentDialog = (e: React.MouseEvent, demandId: string) => {
    e.stopPropagation();
    setAdjustmentDemandId(demandId);
    setAdjustmentReason("");
    setAdjustmentDialogOpen(true);
  };

  const handleRequestAdjustment = async () => {
    if (!adjustmentDemandId || !adjustmentStatusId || !adjustmentReason.trim()) return;
    
    updateDemand.mutate(
      { id: adjustmentDemandId, status_id: adjustmentStatusId },
      {
        onSuccess: async () => {
          toast.success("Ajuste solicitado com sucesso!");
          createInteraction.mutate({
            demand_id: adjustmentDemandId,
            interaction_type: "adjustment_request",
            content: `Solicitou ajuste: ${adjustmentReason.trim()}`,
          });
          
          // Notify all assignees about the adjustment request
          if (adjustmentAssignees && adjustmentAssignees.length > 0) {
            const notifications = adjustmentAssignees.map((assignee) => ({
              user_id: assignee.user_id,
              title: "Ajuste solicitado",
              message: `Foi solicitado ajuste na demanda "${adjustmentDemand?.title}": ${adjustmentReason.trim().substring(0, 100)}${adjustmentReason.length > 100 ? '...' : ''}`,
              type: "warning",
              link: `/demands/${adjustmentDemandId}`,
            }));
            
            await supabase.from("notifications").insert(notifications);
            
            // Send email notifications to assignees
            for (const assignee of adjustmentAssignees) {
              try {
                await supabase.functions.invoke("send-email", {
                  body: {
                    to: assignee.user_id,
                    subject: `Ajuste solicitado: ${adjustmentDemand?.title}`,
                    template: "notification",
                    templateData: {
                      title: "Ajuste Solicitado",
                      message: `Foi solicitado um ajuste na demanda "${adjustmentDemand?.title}".\n\nMotivo: ${adjustmentReason.trim()}`,
                      actionUrl: `${window.location.origin}/demands/${adjustmentDemandId}`,
                      actionText: "Ver Demanda",
                      userName: assignee.profile?.full_name || "Responsável",
                      type: "warning" as const,
                    },
                  },
                });
              } catch (emailError) {
                console.error("Error sending adjustment email:", emailError);
              }
            }
          }
          
          setAdjustmentReason("");
          setAdjustmentDialogOpen(false);
          setAdjustmentDemandId(null);
        },
        onError: (error: any) => {
          toast.error("Erro ao solicitar ajuste", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
      {columns.map((column) => (
        <div
          key={column.key}
          className={cn(
            "rounded-lg p-4 transition-colors flex flex-col min-h-0",
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

          <div className="space-y-3 flex-1 overflow-y-auto">
            {getDemandsForColumn(column.key).map((demand) => {
              const assignees = demand.demand_assignees || [];
              const adjustmentCount = adjustmentCounts?.[demand.id] || 0;
              
              return (
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
                      {!readOnly && (
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                      )}
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

                          {adjustmentCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {adjustmentCount} {adjustmentCount === 1 ? "ajuste" : "ajustes"}
                            </Badge>
                          )}

                          {demand.teams?.name && (
                            <Badge variant="secondary" className="text-xs">
                              {demand.teams.name}
                            </Badge>
                          )}
                        </div>

                        {/* Completion time for delivered demands */}
                        {column.key === "Entregue" && demand.created_at && demand.updated_at && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1 mb-2">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono font-medium">
                              {formatCompletionTime(demand.created_at, demand.updated_at)}
                            </span>
                          </div>
                        )}

                        {/* Adjustment button for delivered demands */}
                        {column.key === "Entregue" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)}
                            className="w-full mt-2 border-purple-500/30 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 text-xs"
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            Solicitar Ajuste
                          </Button>
                        )}

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

                          {assignees.length > 0 ? (
                            <AssigneeAvatars assignees={assignees} size="sm" maxVisible={3} />
                          ) : demand.assigned_profile ? (
                            <AssigneeAvatars 
                              assignees={[{ 
                                user_id: "legacy", 
                                profile: { 
                                  full_name: demand.assigned_profile.full_name, 
                                  avatar_url: demand.assigned_profile.avatar_url || null 
                                } 
                              }]} 
                              size="sm" 
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {getDemandsForColumn(column.key).length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                {readOnly ? "Nenhuma demanda" : "Arraste demandas aqui"}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Adjustment Request Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={(open) => {
        setAdjustmentDialogOpen(open);
        if (!open) {
          setAdjustmentReason("");
          setAdjustmentDemandId(null);
        }
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar ajuste</DialogTitle>
            <DialogDescription>
              Descreva o que precisa ser ajustado na demanda "{adjustmentDemand?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="kanban-adjustment-reason" className="text-sm font-medium">
                Motivo do ajuste <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="kanban-adjustment-reason"
                placeholder="Descreva o que precisa ser corrigido ou alterado..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {adjustmentReason.length}/1000
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAdjustmentDialogOpen(false);
                setAdjustmentReason("");
                setAdjustmentDemandId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestAdjustment}
              disabled={!adjustmentReason.trim() || updateDemand.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateDemand.isPending ? "Enviando..." : "Solicitar Ajuste"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
