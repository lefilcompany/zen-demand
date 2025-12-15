import { useState, useMemo, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, GripVertical, RefreshCw, Wrench, ChevronRight, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errorUtils";
import { useUpdateDemand, useDemandStatuses, useCreateInteraction } from "@/hooks/useDemands";
import { useDemandAssignees } from "@/hooks/useDemandAssignees";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { DemandTimeDisplay } from "@/components/DemandTimeDisplay";
import { toast } from "sonner";
import { useAdjustmentCounts } from "@/hooks/useAdjustmentCount";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";

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
  time_in_progress_seconds?: number | null;
  last_started_at?: string | null;
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
  { key: "A Iniciar", label: "A Iniciar", color: "bg-muted", shortLabel: "Iniciar" },
  { key: "Fazendo", label: "Fazendo", color: "bg-blue-500/10", shortLabel: "Fazendo" },
  { key: "Em Ajuste", label: "Em Ajuste", color: "bg-purple-500/10", shortLabel: "Ajuste" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10", shortLabel: "Entregue" },
];

// Custom hook to detect medium screens (tablet and small desktop)
function useIsMediumScreen() {
  const [isMediumScreen, setIsMediumScreen] = useState(false);

  useEffect(() => {
    const checkIsMediumScreen = () => {
      const width = window.innerWidth;
      // Detect screens between 768px and 1280px as "medium" requiring collapsible layout
      setIsMediumScreen(width >= 768 && width < 1280);
    };
    
    checkIsMediumScreen();
    window.addEventListener("resize", checkIsMediumScreen);
    return () => window.removeEventListener("resize", checkIsMediumScreen);
  }, []);

  return isMediumScreen;
}

export function KanbanBoard({ demands, onDemandClick, readOnly = false }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const isMediumScreen = useIsMediumScreen();
  const { user } = useAuth();
  const [activeColumn, setActiveColumn] = useState(columns[0].key);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
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

  const handleDragOver = (e: React.DragEvent, columnKey?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (columnKey && dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Limpar estados de drag imediatamente para evitar glitches visuais
    const currentDraggedId = draggedId;
    setDraggedId(null);
    setDragOverColumn(null);
    
    if (!currentDraggedId || !statuses) return;

    const targetStatus = statuses.find((s) => s.name === columnKey);
    if (!targetStatus) return;

    const demand = demands.find((d) => d.id === currentDraggedId);
    const previousStatusName = demand?.demand_statuses?.name;
    
    if (previousStatusName === columnKey) return;

    // Mudar para a aba de destino no modo tablet para acompanhar o card
    if (isMediumScreen) {
      setActiveColumn(columnKey);
    }

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && columnKey === "Entregue";

    updateDemand.mutate(
      {
        id: currentDraggedId,
        status_id: targetStatus.id,
      },
      {
        onSuccess: async () => {
          toast.success(`Status alterado para "${columnKey}"`);
          
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
  };

  // Handle mobile status change via dropdown
  const handleMobileStatusChange = async (demandId: string, newStatusKey: string) => {
    if (!statuses) return;
    
    const targetStatus = statuses.find((s) => s.name === newStatusKey);
    if (!targetStatus) return;

    const demand = demands.find((d) => d.id === demandId);
    const previousStatusName = demand?.demand_statuses?.name;
    
    if (previousStatusName === newStatusKey) return;

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && newStatusKey === "Entregue";

    updateDemand.mutate(
      {
        id: demandId,
        status_id: targetStatus.id,
      },
      {
        onSuccess: async () => {
          toast.success(`Status alterado para "${newStatusKey}"`);
          
          if (isAdjustmentCompletion && demand) {
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: demand.created_by,
                  subject: `Ajuste concluído: ${demand.title}`,
                  template: "notification",
                  templateData: {
                    title: "Ajuste Concluído",
                    message: `O ajuste solicitado na demanda "${demand.title}" foi finalizado com sucesso.`,
                    actionUrl: `${window.location.origin}/demands/${demand.id}`,
                    actionText: "Ver Demanda",
                    type: "success",
                  },
                },
              });
            } catch (emailError) {
              console.error("Erro ao enviar email:", emailError);
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
  };

  const getDemandsForColumn = (columnKey: string) => {
    return demands.filter((d) => d.demand_statuses?.name === columnKey);
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleOpenAdjustmentDialog = (e: React.MouseEvent, demandId: string) => {
    e.stopPropagation();
    setAdjustmentDemandId(demandId);
    setAdjustmentReason("");
    setAdjustmentDialogOpen(true);
  };

  const handleRequestAdjustment = async () => {
    if (!adjustmentDemandId || !adjustmentStatusId || !adjustmentReason.trim()) return;
    
    if (!user) {
      toast.error("Você precisa estar autenticado para solicitar ajustes");
      return;
    }
    
    try {
      await new Promise<void>((resolve, reject) => {
        createInteraction.mutate(
          {
            demand_id: adjustmentDemandId,
            interaction_type: "adjustment_request",
            content: adjustmentReason.trim(),
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
      
      await new Promise<void>((resolve, reject) => {
        updateDemand.mutate(
          { id: adjustmentDemandId, status_id: adjustmentStatusId },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
      
      toast.success("Ajuste solicitado com sucesso!");
      
      if (adjustmentAssignees && adjustmentAssignees.length > 0) {
        const notifications = adjustmentAssignees.map((assignee) => ({
          user_id: assignee.user_id,
          title: "Ajuste solicitado",
          message: `Foi solicitado ajuste na demanda "${adjustmentDemand?.title}": ${adjustmentReason.trim().substring(0, 100)}${adjustmentReason.length > 100 ? '...' : ''}`,
          type: "warning",
          link: `/demands/${adjustmentDemandId}`,
        }));
        
        await supabase.from("notifications").insert(notifications);
        
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
    } catch (error: any) {
      console.error("Erro ao solicitar ajuste:", error);
      toast.error("Erro ao solicitar ajuste", {
        description: getErrorMessage(error),
      });
    }
  };

  // Handle drag start only from the drag handle
  const handleDragHandleMouseDown = (e: React.MouseEvent, demandId: string) => {
    e.stopPropagation();
  };

  // Render demand card
  const renderDemandCard = (demand: Demand, columnKey: string, showMoveMenu: boolean = false) => {
    const assignees = demand.demand_assignees || [];
    const adjustmentCount = adjustmentCounts?.[demand.id] || 0;
    // Show drag handle on desktop and tablet (medium screens), not on mobile
    const showDragHandle = !readOnly && !isMobile;
    const currentStatus = demand.demand_statuses?.name;
    const availableStatuses = columns.filter(col => col.key !== currentStatus);
    
    return (
      <Card
        key={demand.id}
        draggable={false}
        className={cn(
          "hover:shadow-md transition-all cursor-pointer",
          draggedId === demand.id && "opacity-50 scale-95",
          "group relative"
        )}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            {/* Drag handle for desktop and tablet */}
            {showDragHandle && (
              <div
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(e, demand.id);
                }}
                onDragEnd={handleDragEnd}
                onMouseDown={(e) => handleDragHandleMouseDown(e, demand.id)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex items-center justify-center rounded-md p-1.5 -ml-1 mt-0.5",
                  "bg-primary/10 hover:bg-primary/20 cursor-grab active:cursor-grabbing",
                  "transition-all duration-200",
                  "opacity-80 group-hover:opacity-100",
                  "touch-none select-none"
                )}
                title="Arraste para mover"
              >
                <GripVertical className="h-4 w-4 text-primary" />
              </div>
            )}
            
            {/* Mobile move menu - dropdown to change status */}
            {showMoveMenu && !readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -ml-1 mt-0.5 bg-primary/10 hover:bg-primary/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background">
                  {availableStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMobileStatusChange(demand.id, status.key);
                      }}
                      className="cursor-pointer"
                    >
                      <div className={cn("w-2 h-2 rounded-full mr-2", status.color.replace('/10', ''))} />
                      Mover para {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <div 
              className="flex-1 min-w-0"
              onClick={() => onDemandClick(demand.id)}
            >
              <h4 className="font-medium text-sm line-clamp-2 mb-2">
                {demand.title}
              </h4>

              {demand.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {demand.description}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
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
                    {adjustmentCount}
                  </Badge>
                )}

                {demand.teams?.name && (
                  <Badge variant="secondary" className="text-xs truncate max-w-[100px]">
                    {demand.teams.name}
                  </Badge>
                )}
              </div>

              {(columnKey === "Entregue" || columnKey === "Fazendo") && (
                <DemandTimeDisplay
                  createdAt={demand.created_at}
                  updatedAt={demand.updated_at}
                  timeInProgressSeconds={demand.time_in_progress_seconds}
                  lastStartedAt={demand.last_started_at}
                  isInProgress={columnKey === "Fazendo"}
                  isDelivered={columnKey === "Entregue"}
                  variant="card"
                />
              )}

              {columnKey === "Entregue" && (
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

              <div className="flex items-center justify-between mt-2">
                {demand.due_date && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue(demand.due_date) && columnKey !== "Entregue"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {isOverdue(demand.due_date) && columnKey !== "Entregue" ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {format(new Date(demand.due_date), "dd MMM", { locale: ptBR })}
                  </div>
                )}

                {assignees.length > 0 ? (
                  <AssigneeAvatars assignees={assignees} size="sm" maxVisible={2} />
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
  };

  // Render column content
  const renderColumnContent = (columnKey: string, showMoveMenu: boolean = false) => {
    const columnDemands = getDemandsForColumn(columnKey);
    
    return (
      <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
        {columnDemands.map((demand) => renderDemandCard(demand, columnKey, showMoveMenu))}
        {columnDemands.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            {readOnly ? "Nenhuma demanda" : (isMobile ? "Nenhuma demanda" : "Arraste demandas aqui")}
          </div>
        )}
      </div>
    );
  };

  // Adjustment Dialog Component
  const AdjustmentDialog = () => (
    <Dialog open={adjustmentDialogOpen} onOpenChange={(open) => {
      setAdjustmentDialogOpen(open);
      if (!open) {
        setAdjustmentReason("");
        setAdjustmentDemandId(null);
      }
    }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
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
            disabled={!adjustmentReason.trim() || updateDemand.isPending || createInteraction.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {(updateDemand.isPending || createInteraction.isPending) ? "Enviando..." : "Solicitar Ajuste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Mobile view with dropdown selector - shows move menu on cards
  if (isMobile) {
    const activeColumnData = columns.find(c => c.key === activeColumn) || columns[0];
    
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Select value={activeColumn} onValueChange={setActiveColumn}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center justify-between w-full">
                  <span>{activeColumnData.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {getDemandsForColumn(activeColumn).length}
                  </Badge>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg">
              {columns.map((column) => (
                <SelectItem key={column.key} value={column.key}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{column.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getDemandsForColumn(column.key).length}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn("rounded-lg p-3 sm:p-4 flex flex-col flex-1 min-h-0", activeColumnData.color)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {activeColumnData.label}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {getDemandsForColumn(activeColumn).length}
            </Badge>
          </div>
          {/* Pass showMoveMenu=true for mobile */}
          {renderColumnContent(activeColumn, true)}
        </div>

        <AdjustmentDialog />
      </div>
    );
  }

  // Medium screen view (tablet/small desktop) with horizontal collapsible tabs and drag-drop
  if (isMediumScreen) {
    return (
      <div className="flex flex-col h-full gap-2">
        {/* Horizontal tabs row */}
        <div className="flex gap-2 h-full min-h-0">
          {columns.map((column) => {
            const isActive = activeColumn === column.key;
            const columnDemands = getDemandsForColumn(column.key);
            const isDragTarget = dragOverColumn === column.key && draggedId;
            
            return (
              <div
                key={column.key}
                className={cn(
                  "rounded-lg flex flex-col min-h-0 overflow-hidden",
                  "transition-all duration-300 ease-out will-change-[flex,transform]",
                  column.color,
                  isActive 
                    ? "flex-[4] p-4" 
                    : "flex-[0.6] p-2 cursor-pointer hover:flex-[0.8] hover:bg-opacity-80",
                  // Visual feedback when dragging over this column
                  isDragTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                )}
                onClick={() => !isActive && setActiveColumn(column.key)}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {isActive ? (
                  // Expanded state
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        {column.label}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnDemands.length}
                      </Badge>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {renderColumnContent(column.key)}
                    </div>
                  </div>
                ) : (
                  // Collapsed state - vertical text with smooth transitions and drop zone indicator
                  <div className={cn(
                    "flex flex-col items-center justify-start h-full gap-2 py-2 transition-all duration-300",
                    isDragTarget && "bg-primary/20"
                  )}>
                    <Badge 
                      variant="secondary" 
                      className="text-xs shrink-0 transition-all duration-300 hover:scale-110"
                    >
                      {columnDemands.length}
                    </Badge>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      <span 
                        className={cn(
                          "font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                          "transition-all duration-300 hover:text-foreground",
                          isDragTarget && "text-primary font-bold"
                        )}
                        style={{ 
                          writingMode: 'vertical-rl', 
                          textOrientation: 'mixed',
                          transform: 'rotate(180deg)'
                        }}
                      >
                        {column.shortLabel}
                      </span>
                    </div>
                    <ChevronRight 
                      className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0",
                        "transition-all duration-300 hover:text-foreground hover:translate-x-0.5",
                        isDragTarget && "text-primary"
                      )} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AdjustmentDialog />
      </div>
    );
  }

  // Large Desktop view with all columns visible and drag-drop with visual feedback
  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {columns.map((column) => {
        const isDragTarget = dragOverColumn === column.key && draggedId;
        
        return (
          <div
            key={column.key}
            className={cn(
              "rounded-lg p-4 transition-all duration-200 flex flex-col min-h-0",
              column.color,
              // Visual feedback when any drag is happening
              draggedId && "ring-2 ring-primary/20",
              // Highlight the specific column being hovered
              isDragTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] bg-primary/10"
            )}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                "font-semibold text-sm uppercase tracking-wide text-muted-foreground transition-colors",
                isDragTarget && "text-primary"
              )}>
                {column.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {getDemandsForColumn(column.key).length}
              </Badge>
            </div>

            {renderColumnContent(column.key)}
          </div>
        );
      })}

      <AdjustmentDialog />
    </div>
  );
}
