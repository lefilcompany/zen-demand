import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useUpdateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { DemandTimeDisplay } from "@/components/DemandTimeDisplay";
import { KanbanAdjustmentDialog } from "@/components/KanbanAdjustmentDialog";
import { toast } from "sonner";
import { useAdjustmentCounts } from "@/hooks/useAdjustmentCount";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimerControl } from "@/hooks/useTimerControl";

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
  userRole?: string;
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
  { key: "Aprovação do Cliente", label: "Aprovação do Cliente", color: "bg-amber-500/10", shortLabel: "Aprovação" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10", shortLabel: "Entregue" },
];

// Custom hook to detect tablet/small desktop (768px - 1023px) - single tab mode
function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkIsTablet();
    window.addEventListener("resize", checkIsTablet);
    return () => window.removeEventListener("resize", checkIsTablet);
  }, []);

  return isTablet;
}

// Custom hook to detect large desktop (>=1024px) - multiple tabs mode
function useIsLargeDesktop() {
  const [isLargeDesktop, setIsLargeDesktop] = useState(false);

  useEffect(() => {
    const checkIsLargeDesktop = () => {
      const width = window.innerWidth;
      setIsLargeDesktop(width >= 1024);
    };
    
    checkIsLargeDesktop();
    window.addEventListener("resize", checkIsLargeDesktop);
    return () => window.removeEventListener("resize", checkIsLargeDesktop);
  }, []);

  return isLargeDesktop;
}

const MAX_OPEN_COLUMNS = 3;

export function KanbanBoard({ demands, onDemandClick, readOnly = false, userRole }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isLargeDesktop = useIsLargeDesktop();
  // Track multiple active columns (max 3), using array to maintain order (FIFO)
  const [activeColumns, setActiveColumns] = useState<string[]>([columns[0].key]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentDemandId, setAdjustmentDemandId] = useState<string | null>(null);
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();
  
  const demandIds = useMemo(() => demands.map(d => d.id), [demands]);
  const { data: adjustmentCounts } = useAdjustmentCounts(demandIds);
  const { startTimer, pauseTimer, isLoading: isTimerLoading } = useTimerControl();
  
  const adjustmentDemand = demands.find(d => d.id === adjustmentDemandId);

  // Handle column toggle with FIFO logic (max 3 columns)
  const toggleColumn = useCallback((columnKey: string) => {
    setActiveColumns(prev => {
      // If already active, close it (but keep at least one open)
      if (prev.includes(columnKey)) {
        if (prev.length > 1) {
          return prev.filter(c => c !== columnKey);
        }
        return prev; // Keep at least one column open
      }
      
      // Opening a new column
      const newColumns = [...prev, columnKey];
      
      // If exceeds max, remove the first one (FIFO)
      if (newColumns.length > MAX_OPEN_COLUMNS) {
        return newColumns.slice(1);
      }
      
      return newColumns;
    });
  }, []);

  const handleAdjustmentDialogChange = useCallback((open: boolean) => {
    setAdjustmentDialogOpen(open);
    if (!open) {
      setAdjustmentDemandId(null);
    }
  }, []);

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

    // Adicionar a aba de destino às abertas no modo desktop grande para acompanhar o card
    if (isLargeDesktop && !activeColumns.includes(columnKey)) {
      toggleColumn(columnKey);
    } else if (isTablet) {
      setActiveColumns([columnKey]);
    }

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && columnKey === "Aprovação do Cliente";

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

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && newStatusKey === "Aprovação do Cliente";

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

  const handleOpenAdjustmentDialog = useCallback((e: React.MouseEvent, demandId: string) => {
    e.stopPropagation();
    setAdjustmentDemandId(demandId);
    setAdjustmentDialogOpen(true);
  }, []);

  // Handle drag start only from the drag handle
  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Render demand card
  const renderDemandCard = (demand: Demand, columnKey: string, showMoveMenu: boolean = false) => {
    const assignees = demand.demand_assignees || [];
    const adjustmentCount = adjustmentCounts?.[demand.id] || 0;
    // Demandas em "Entregue" não podem ser movidas
    const isDelivered = columnKey === "Entregue";
    // Show drag handle on desktop and tablet (medium screens), not on mobile, and not for delivered demands
    const showDragHandle = !readOnly && !isMobile && !isDelivered;
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
                onMouseDown={handleDragHandleMouseDown}
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
            
            {/* Mobile move menu - dropdown to change status (not for delivered) */}
            {showMoveMenu && !readOnly && !isDelivered && (
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

              {(columnKey === "Entregue" || columnKey === "Aprovação do Cliente" || columnKey === "Fazendo" || columnKey === "Em Ajuste") && (() => {
                const canControlTimer = !readOnly && 
                  (userRole === "admin" || userRole === "moderator" || userRole === "executor") &&
                  (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                const isTimerRunning = !!demand.last_started_at;
                
                return (
                  <DemandTimeDisplay
                    createdAt={demand.created_at}
                    updatedAt={demand.updated_at}
                    timeInProgressSeconds={demand.time_in_progress_seconds}
                    lastStartedAt={demand.last_started_at}
                    isInProgress={isTimerRunning}
                    isDelivered={columnKey === "Entregue" || columnKey === "Aprovação do Cliente"}
                    variant="card"
                    showTimerControls={canControlTimer}
                    isTimerRunning={isTimerRunning}
                    onPlayClick={() => startTimer.mutate(demand.id)}
                    onPauseClick={() => pauseTimer.mutate({
                      demandId: demand.id,
                      lastStartedAt: demand.last_started_at!,
                      currentSeconds: demand.time_in_progress_seconds || 0,
                    })}
                    isLoading={isTimerLoading}
                  />
                );
              })()}

              {columnKey === "Aprovação do Cliente" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)}
                  className="w-full mt-2 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs"
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


  // Mobile view with dropdown selector - shows move menu on cards
  if (isMobile) {
    const mobileActiveColumn = activeColumns[0] || columns[0].key;
    const activeColumnData = columns.find(c => c.key === mobileActiveColumn) || columns[0];
    
    const handleMobileColumnChange = (value: string) => {
      setActiveColumns([value]);
    };
    
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Select value={mobileActiveColumn} onValueChange={handleMobileColumnChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center justify-between w-full">
                  <span>{activeColumnData.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {getDemandsForColumn(mobileActiveColumn).length}
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
              {getDemandsForColumn(mobileActiveColumn).length}
            </Badge>
          </div>
          {/* Pass showMoveMenu=true for mobile */}
          {renderColumnContent(mobileActiveColumn, true)}
        </div>

        <KanbanAdjustmentDialog
          open={adjustmentDialogOpen}
          onOpenChange={handleAdjustmentDialogChange}
          demandId={adjustmentDemandId}
          demandTitle={adjustmentDemand?.title}
        />
      </div>
    );
  }

  // Tablet/Small desktop view - single tab collapsible layout with drag-drop
  if (isTablet) {
    const tabletActiveColumn = activeColumns[0] || columns[0].key;
    
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex gap-2 h-full min-h-0">
          {columns.map((column) => {
            const isActive = tabletActiveColumn === column.key;
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
                  isDragTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                )}
                onClick={() => !isActive && setActiveColumns([column.key])}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {isActive ? (
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
                  <div className={cn(
                    "flex flex-col items-center justify-start h-full gap-2 py-2 transition-all duration-300",
                    isDragTarget && "bg-primary/20"
                  )}>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {columnDemands.length}
                    </Badge>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      <span 
                        className={cn(
                          "font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                          isDragTarget && "text-primary font-bold"
                        )}
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
                      >
                        {column.shortLabel}
                      </span>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0", isDragTarget && "text-primary")} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <KanbanAdjustmentDialog
          open={adjustmentDialogOpen}
          onOpenChange={handleAdjustmentDialogChange}
          demandId={adjustmentDemandId}
          demandTitle={adjustmentDemand?.title}
        />
      </div>
    );
  }

  // Large Desktop view - multiple tabs (up to 3) with drag-drop
  if (isLargeDesktop) {
    const openCount = activeColumns.length;
    const getFlexValue = (isActive: boolean) => {
      if (!isActive) return "flex-[0.5]";
      if (openCount === 1) return "flex-[5]";
      if (openCount === 2) return "flex-[2.5]";
      return "flex-[1.7]";
    };

    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex gap-2 h-full min-h-0">
          {columns.map((column) => {
            const isActive = activeColumns.includes(column.key);
            const columnDemands = getDemandsForColumn(column.key);
            const isDragTarget = dragOverColumn === column.key && draggedId;
            
            return (
              <div
                key={column.key}
                className={cn(
                  "rounded-lg flex flex-col min-h-0 overflow-hidden",
                  "transition-all duration-300 ease-out will-change-[flex,transform]",
                  column.color,
                  getFlexValue(isActive),
                  isActive ? "p-4" : "p-2 cursor-pointer hover:bg-opacity-80",
                  isDragTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                )}
                onClick={() => toggleColumn(column.key)}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {isActive ? (
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
                  <div className={cn(
                    "flex flex-col items-center justify-start h-full gap-2 py-2 transition-all duration-300",
                    isDragTarget && "bg-primary/20"
                  )}>
                    <Badge variant="secondary" className="text-xs shrink-0 transition-all duration-300 hover:scale-110">
                      {columnDemands.length}
                    </Badge>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      <span 
                        className={cn(
                          "font-semibold text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                          "transition-all duration-300 hover:text-foreground",
                          isDragTarget && "text-primary font-bold"
                        )}
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
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

        <KanbanAdjustmentDialog
          open={adjustmentDialogOpen}
          onOpenChange={handleAdjustmentDialogChange}
          demandId={adjustmentDemandId}
          demandTitle={adjustmentDemand?.title}
        />
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
