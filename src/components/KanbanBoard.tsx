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
import { Calendar, Clock, GripVertical, RefreshCw, Wrench, ChevronRight, ArrowRight, X, WifiOff, CloudOff, Check } from "lucide-react";
import { format } from "date-fns";
import { formatDateOnlyBR, isDateOverdue } from "@/lib/dateUtils";
import { cn, truncateText } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errorUtils";
import { formatDemandCode } from "@/lib/demandCodeUtils";
import { useUpdateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { extractPlainText } from "@/components/ui/rich-text-editor";
import { KanbanTimeDisplay } from "@/components/KanbanTimeDisplay";
import { KanbanAdjustmentDialog } from "@/components/KanbanAdjustmentDialog";
import { toast } from "sonner";
import { useAdjustmentCounts, AdjustmentInfo } from "@/hooks/useAdjustmentCount";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

import { sendAdjustmentCompletionPushNotification } from "@/hooks/useSendPushNotification";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  team_id?: string; // Added for adjustment type determination
  board_sequence_number?: number | null; // Sequential ID per board
  service_id?: string | null;
  demand_statuses?: { name: string; color: string } | null;
  profiles?: { full_name: string; avatar_url?: string | null } | null;
  assigned_profile?: { full_name: string; avatar_url?: string | null } | null;
  teams?: { name: string } | null;
  services?: { id: string; name: string } | null;
  demand_assignees?: Assignee[];
  _isOffline?: boolean; // Flag for offline-created demands
}

type AdjustmentTypeColumn = 'none' | 'internal' | 'external';

interface KanbanColumn {
  key: string;
  label: string;
  color: string;
  shortLabel: string;
  statusId?: string;
  adjustmentType?: AdjustmentTypeColumn;
}

interface KanbanBoardProps {
  demands: Demand[];
  columns?: KanbanColumn[];
  onDemandClick: (id: string) => void;
  readOnly?: boolean;
  userRole?: string;
  boardName?: string;
  boardId?: string | null;
}

const priorityColors: Record<string, string> = {
  baixa: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  média: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  alta: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

// Check if a color is a hex color (custom) vs a Tailwind class (system)
function isHexColor(color: string): boolean {
  return color.startsWith("#") || color.startsWith("rgb");
}

// Get background style for column (supports both Tailwind classes and hex colors)
function getColumnBackgroundStyle(color: string): { className: string; style?: React.CSSProperties } {
  if (isHexColor(color)) {
    // For hex colors, use inline style with opacity
    return {
      className: "",
      style: { backgroundColor: `${color}20` } // Add 20 (12.5% opacity) for subtle background
    };
  }
  // For Tailwind classes, use className
  return { className: color };
}

// Default columns (fallback)
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { key: "A Iniciar", label: "A Iniciar", color: "bg-muted", shortLabel: "Iniciar", adjustmentType: "none" },
  { key: "Fazendo", label: "Fazendo", color: "bg-blue-500/10", shortLabel: "Fazendo", adjustmentType: "none" },
  { key: "Em Ajuste", label: "Em Ajuste", color: "bg-purple-500/10", shortLabel: "Ajuste", adjustmentType: "none" },
  { key: "Aprovação Interna", label: "Aprovação Interna", color: "bg-blue-500/10", shortLabel: "Apr. Int.", adjustmentType: "internal" },
  { key: "Aprovação do Cliente", label: "Aprovação do Cliente", color: "bg-amber-500/10", shortLabel: "Aprovação", adjustmentType: "external" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10", shortLabel: "Entregue", adjustmentType: "none" },
];

// Custom hook to detect tablet and small desktop (768px - 1279px) - single tab mode
function useIsTabletOrSmallDesktop() {
  const [isTabletOrSmallDesktop, setIsTabletOrSmallDesktop] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      // Tablet and small desktop: single tab collapsible
      setIsTabletOrSmallDesktop(width >= 768 && width < 1280);
    };
    
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isTabletOrSmallDesktop;
}

// Custom hook to detect medium/large desktop (>=1280px) - multiple tabs mode
function useIsLargeDesktop() {
  const [isLargeDesktop, setIsLargeDesktop] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      // Medium/Large desktop: multiple tabs (up to 3)
      setIsLargeDesktop(width >= 1280);
    };
    
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isLargeDesktop;
}

// No limit on open columns - users can open all if they want
// Horizontal scroll handles overflow

export function KanbanBoard({ demands, columns: propColumns, onDemandClick, readOnly = false, userRole, boardName, boardId }: KanbanBoardProps) {
  // Use provided columns or fallback to default
  const columns = propColumns && propColumns.length > 0 ? propColumns : DEFAULT_COLUMNS;
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isTabletOrSmallDesktop = useIsTabletOrSmallDesktop();
  const isLargeDesktop = useIsLargeDesktop();
  const { isOffline } = useOfflineStatus();
  const queryClient = useQueryClient();
  
  // Track multiple active columns (max 3), using array to maintain order (FIFO)
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentDemandId, setAdjustmentDemandId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, string>>({});
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();
  
  const demandIds = useMemo(() => demands.map(d => d.id), [demands]);
  const { data: adjustmentCounts } = useAdjustmentCounts(demandIds);

  // Helper function to stop all active timers for a demand
  const stopAllTimersForDemand = useCallback(async (demandId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Find all active time entries for this demand (current user)
      const { data: activeEntries, error: fetchError } = await supabase
        .from("demand_time_entries")
        .select("id, started_at")
        .eq("demand_id", demandId)
        .eq("user_id", user.id)
        .is("ended_at", null);

      if (fetchError) throw fetchError;

      if (activeEntries && activeEntries.length > 0) {
        for (const entry of activeEntries) {
          const now = new Date();
          const startedAt = new Date(entry.started_at);
          const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

          await supabase
            .from("demand_time_entries")
            .update({
              ended_at: now.toISOString(),
              duration_seconds: durationSeconds,
            })
            .eq("id", entry.id);
        }
        
        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ["demand-time-entries", demandId] });
        queryClient.invalidateQueries({ queryKey: ["current-user-demand-time", demandId] });
        
        // Show notification that timer was stopped
        toast.info("Timer pausado automaticamente", {
          description: "O timer foi pausado pois a demanda foi movida para aprovação/entrega",
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error stopping timers:", error);
      return false;
    }
  }, [user, queryClient]);
  
  const adjustmentDemand = demands.find(d => d.id === adjustmentDemandId);

  // Handle column toggle - no limit, users can open all columns
  const toggleColumn = useCallback((columnKey: string) => {
    setActiveColumns(prev => {
      // If already active, close it
      if (prev.includes(columnKey)) {
        return prev.filter(c => c !== columnKey);
      }
      // Opening a new column - no limit
      return [...prev, columnKey];
    });
  }, []);

  // Close a single column (for tablet/small desktop)
  const closeColumn = useCallback((columnKey: string) => {
    setActiveColumns(prev => prev.filter(c => c !== columnKey));
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
    
    if (!currentDraggedId) return;

    // Get target column from props (includes custom statuses)
    const targetColumn = columns.find((c) => c.key === columnKey);
    if (!targetColumn || !targetColumn.statusId) {
      // Fallback to statuses lookup for backwards compatibility
      const targetStatus = statuses?.find((s) => s.name === columnKey);
      if (!targetStatus) return;
      
      const demand = demands.find((d) => d.id === currentDraggedId);
      const previousStatusName = demand?.demand_statuses?.name;
      
      if (previousStatusName === columnKey) return;

      // Handle drop with legacy status lookup
      handleDropWithStatusId(currentDraggedId, targetStatus.id, columnKey, demand);
      return;
    }

    const demand = demands.find((d) => d.id === currentDraggedId);
    const previousStatusName = demand?.demand_statuses?.name;
    
    if (previousStatusName === columnKey) return;

    // Interceptar tentativa de mover para "Em Ajuste" - abrir diálogo ao invés de mover direto
    if (columnKey === "Em Ajuste") {
      setAdjustmentDemandId(currentDraggedId);
      setAdjustmentDialogOpen(true);
      return;
    }

    handleDropWithStatusId(currentDraggedId, targetColumn.statusId, columnKey, demand);
  };

  // Helper function to handle drop with a specific status ID
  const handleDropWithStatusId = async (demandId: string, statusId: string, columnKey: string, demand: Demand | undefined) => {
    const previousStatusName = demand?.demand_statuses?.name;

    // Adicionar a aba de destino às abertas no modo desktop grande para acompanhar o card
    if (isLargeDesktop && !activeColumns.includes(columnKey)) {
      toggleColumn(columnKey);
    } else if (isTabletOrSmallDesktop) {
      setActiveColumns([columnKey]);
    }

    // Apply optimistic update immediately for smooth UX (especially offline)
    setOptimisticUpdates(prev => ({ ...prev, [demandId]: columnKey }));

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && columnKey === "Aprovação do Cliente";

    // Stop timer if moving to "Aprovação do Cliente" or "Entregue"
    if (columnKey === "Aprovação do Cliente" || columnKey === "Entregue") {
      stopAllTimersForDemand(demandId);
    }

    updateDemand.mutate(
      {
        id: demandId,
        status_id: statusId,
      },
      {
        onSuccess: async () => {
          // Clear optimistic update after success
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });

          // Invalidate to sync with server data
          queryClient.invalidateQueries({ queryKey: ['demands'] });

          if (isOffline) {
            toast.success(`Status alterado para "${columnKey}"`, {
              description: t("sync.offlineDescription"),
              icon: <CloudOff className="h-4 w-4" />,
            });
          } else {
            toast.success(`Status alterado para "${columnKey}"`);
          }
          
          // Only send notifications if online
          if (!isOffline && demand) {
            // Send email notification to creator for important status changes
            const importantStatuses = ["Entregue", "Aprovação do Cliente", "Em Ajuste"];
            if (importantStatuses.includes(columnKey) && demand.created_by && demand.created_by !== user?.id) {
              try {
                const statusEmoji = columnKey === "Entregue" ? "✅" : columnKey === "Em Ajuste" ? "🔧" : "📋";
                await supabase.functions.invoke("send-email", {
                  body: {
                    to: demand.created_by,
                    subject: `${statusEmoji} Status atualizado: ${demand.title}`,
                    template: "notification",
                    templateData: {
                      title: "Status da Demanda Atualizado",
                      message: `A demanda "${demand.title}" mudou de "${previousStatusName}" para "${columnKey}".`,
                      actionUrl: `${window.location.origin}/demands/${demand.id}`,
                      actionText: "Ver Demanda",
                      type: columnKey === "Entregue" ? "success" : columnKey === "Em Ajuste" ? "warning" : "info",
                    },
                  },
                });
              } catch (emailError) {
                console.error("Erro ao enviar email de status:", emailError);
              }
            }
            
            // Special handling for adjustment completion
            if (isAdjustmentCompletion && demand.created_by) {
              // Send push notification
              sendAdjustmentCompletionPushNotification({
                creatorId: demand.created_by,
                demandId: demand.id,
                demandTitle: demand.title,
              }).catch(err => console.error("Erro ao enviar push de ajuste concluído:", err));
            }
          }
        },
        onError: (error: any) => {
          // Revert optimistic update on error
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });
          toast.error("Erro ao alterar status", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  // Handle mobile status change via dropdown
  const handleMobileStatusChange = async (demandId: string, newStatusKey: string) => {
    // Interceptar tentativa de mover para "Em Ajuste" - abrir diálogo ao invés de mover direto
    if (newStatusKey === "Em Ajuste") {
      setAdjustmentDemandId(demandId);
      setAdjustmentDialogOpen(true);
      return;
    }
    
    // Get target column from props (includes custom statuses)
    const targetColumn = columns.find((c) => c.key === newStatusKey);
    let targetStatusId: string | undefined;
    
    if (targetColumn?.statusId) {
      targetStatusId = targetColumn.statusId;
    } else {
      // Fallback to statuses lookup for backwards compatibility
      const targetStatus = statuses?.find((s) => s.name === newStatusKey);
      if (!targetStatus) return;
      targetStatusId = targetStatus.id;
    }

    const demand = demands.find((d) => d.id === demandId);
    const previousStatusName = demand?.demand_statuses?.name;
    
    if (previousStatusName === newStatusKey) return;

    // Apply optimistic update immediately
    setOptimisticUpdates(prev => ({ ...prev, [demandId]: newStatusKey }));

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && newStatusKey === "Aprovação do Cliente";

    // Stop timer if moving to "Aprovação do Cliente" or "Entregue"
    if (newStatusKey === "Aprovação do Cliente" || newStatusKey === "Entregue") {
      stopAllTimersForDemand(demandId);
    }

    updateDemand.mutate(
      {
        id: demandId,
        status_id: targetStatusId,
      },
      {
        onSuccess: async () => {
          // Clear optimistic update
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });

          queryClient.invalidateQueries({ queryKey: ['demands'] });

          if (isOffline) {
            toast.success(`Status alterado para "${newStatusKey}"`, {
              description: t("sync.offlineDescription"),
              icon: <CloudOff className="h-4 w-4" />,
            });
          } else {
            toast.success(`Status alterado para "${newStatusKey}"`);
          }
          
          // Only send notifications if online
          if (!isOffline && demand) {
            // Send email notification to creator for important status changes
            const importantStatuses = ["Entregue", "Aprovação do Cliente", "Em Ajuste"];
            if (importantStatuses.includes(newStatusKey) && demand.created_by && demand.created_by !== user?.id) {
              try {
                const statusEmoji = newStatusKey === "Entregue" ? "✅" : newStatusKey === "Em Ajuste" ? "🔧" : "📋";
                await supabase.functions.invoke("send-email", {
                  body: {
                    to: demand.created_by,
                    subject: `${statusEmoji} Status atualizado: ${demand.title}`,
                    template: "notification",
                    templateData: {
                      title: "Status da Demanda Atualizado",
                      message: `A demanda "${demand.title}" mudou de "${previousStatusName}" para "${newStatusKey}".`,
                      actionUrl: `${window.location.origin}/demands/${demand.id}`,
                      actionText: "Ver Demanda",
                      type: newStatusKey === "Entregue" ? "success" : newStatusKey === "Em Ajuste" ? "warning" : "info",
                    },
                  },
                });
              } catch (emailError) {
                console.error("Erro ao enviar email de status:", emailError);
              }
            }
            
            // Special handling for adjustment completion
            if (isAdjustmentCompletion && demand.created_by) {
              // Send push notification
              sendAdjustmentCompletionPushNotification({
                creatorId: demand.created_by,
                demandId: demand.id,
                demandTitle: demand.title,
              }).catch(err => console.error("Erro ao enviar push de ajuste concluído:", err));
            }
          }
        },
        onError: (error: any) => {
          // Revert optimistic update
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });
          toast.error("Erro ao alterar status", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  // Get demands for column, considering optimistic updates
  const getDemandsForColumn = (columnKey: string) => {
    return demands.filter((d) => {
      // Check if there's an optimistic update for this demand
      const optimisticStatus = optimisticUpdates[d.id];
      if (optimisticStatus) {
        return optimisticStatus === columnKey;
      }
      return d.demand_statuses?.name === columnKey;
    });
  };

  const isOverdue = useCallback((dueDate: string | null | undefined) => {
    return isDateOverdue(dueDate);
  }, []);

  const handleOpenAdjustmentDialog = useCallback((e: React.MouseEvent, demandId: string) => {
    e.stopPropagation();
    setAdjustmentDemandId(demandId);
    setAdjustmentDialogOpen(true);
  }, []);

  // Handle marking demand as complete (move to "Entregue")
  const handleMarkAsComplete = useCallback(async (demandId: string) => {
    if (!statuses) return;
    
    const entregueStatus = statuses.find(s => s.name === "Entregue");
    if (!entregueStatus) {
      toast.error("Status 'Entregue' não encontrado");
      return;
    }
    
    const demand = demands.find(d => d.id === demandId);
    if (!demand) return;
    
    // Stop any active timers
    await stopAllTimersForDemand(demandId);
    
    // Apply optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [demandId]: "Entregue" }));
    
    updateDemand.mutate(
      { id: demandId, status_id: entregueStatus.id },
      {
        onSuccess: async () => {
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });
          
          queryClient.invalidateQueries({ queryKey: ['demands'] });
          toast.success("Demanda marcada como concluída!");
          
          // Notify assignees about completion
          if (!isOffline && demand) {
            const assigneeIds = demand.demand_assignees?.map(a => a.user_id) || [];
            if (assigneeIds.length > 0) {
              const notifications = assigneeIds.filter(id => id !== user?.id).map((userId) => ({
                user_id: userId,
                title: `Demanda concluída: ${demand.title}`,
                message: `O cliente marcou a demanda "${demand.title}" como concluída.`,
                type: "success",
                link: `/demands/${demandId}`,
              }));
              
              if (notifications.length > 0) {
                await supabase.from("notifications").insert(notifications);
              }
            }
          }
        },
        onError: (error: any) => {
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });
          toast.error("Erro ao marcar como concluída", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  }, [statuses, demands, stopAllTimersForDemand, updateDemand, queryClient, isOffline, user]);

  // Handle drag start only from the drag handle
  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Render demand card
  const renderDemandCard = (demand: Demand, columnKey: string, showMoveMenu: boolean = false, columnAdjustmentType?: AdjustmentTypeColumn) => {
    const assignees = demand.demand_assignees || [];
    const adjustmentInfo = adjustmentCounts?.[demand.id];
    const adjustmentCount = adjustmentInfo?.count || 0;
    const latestAdjustmentType = adjustmentInfo?.latestType;
    // Demandas em "Entregue" não podem ser movidas
    const isDelivered = columnKey === "Entregue";
    // Show drag handle on desktop and tablet (medium screens), not on mobile, and not for delivered demands
    const showDragHandle = !readOnly && !isMobile && !isDelivered;
    const currentStatus = demand.demand_statuses?.name;
    const availableStatuses = columns.filter(col => col.key !== currentStatus);
    // Check if this demand has a pending optimistic update (offline change)
    const hasPendingSync = !!optimisticUpdates[demand.id];
    // Check if this demand was created offline
    const isOfflineDemand = (demand as Demand)._isOffline === true;
    const showOfflineIndicator = hasPendingSync || isOfflineDemand;
    
    // Get the column's adjustment type
    const colAdjType = columnAdjustmentType || columns.find(c => c.key === columnKey)?.adjustmentType || 'none';
    
    return (
      <Card
        key={demand.id}
        draggable={false}
        className={cn(
          "hover:shadow-md transition-all cursor-pointer",
          draggedId === demand.id && "opacity-50 scale-95",
          showOfflineIndicator && "ring-2 ring-amber-500/50 bg-amber-500/5",
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
              {demand.board_sequence_number && (
                <Badge variant="outline" className="text-xs mb-1.5 bg-muted/50 text-muted-foreground border-muted-foreground/20 font-mono">
                  {formatDemandCode(demand.board_sequence_number)}
                </Badge>
              )}
              <h4 className="font-medium text-sm line-clamp-2 mb-1" title={demand.title}>
                {truncateText(demand.title)}
              </h4>

              {demand.description && (() => {
                const plainText = extractPlainText(demand.description);
                if (!plainText) return null;
                const truncated = plainText.length > 50 ? plainText.slice(0, 50) + "..." : plainText;
                return (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1" title={plainText}>
                    {truncated}
                  </p>
                );
              })()}

              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                {showOfflineIndicator && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                    title={t("sync.offlineDescription")}
                  >
                    <CloudOff className="h-3 w-3 mr-1" />
                    {t("sync.offlinePending")}
                  </Badge>
                )}
                
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

                {/* Service badge */}
                {demand.services?.name && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/5 text-primary border-primary/20 flex items-center gap-1"
                  >
                    <Wrench className="h-3 w-3" />
                    {demand.services.name}
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

                {columnKey === "Em Ajuste" && latestAdjustmentType && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      latestAdjustmentType === "internal"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                    )}
                  >
                    {latestAdjustmentType === "internal" ? "Interno" : "Externo"}
                  </Badge>
                )}
              </div>

              {(columnKey === "Entregue" || columnKey === "Aprovação do Cliente" || columnKey === "Fazendo" || columnKey === "Em Ajuste") && (() => {
                const canControlTimer = !readOnly && 
                  (userRole === "admin" || userRole === "moderator" || userRole === "executor") &&
                  (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                
                const shouldForceShow = canControlTimer && (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                
                return (
                  <KanbanTimeDisplay
                    demandId={demand.id}
                    canControl={canControlTimer}
                    forceShow={shouldForceShow}
                  />
                );
              })()}

              {/* Dynamic adjustment buttons based on column's adjustmentType */}
              {colAdjType !== 'none' && (() => {
                // For internal adjustment columns: only admin/moderator can request
                // For external adjustment columns: only requester can request (and can also mark as complete)
                const canRequestInternal = colAdjType === 'internal' && (userRole === "admin" || userRole === "moderator");
                const canRequestExternal = colAdjType === 'external' && userRole === "requester";
                const canMarkComplete = colAdjType === 'external' && userRole === "requester";
                
                if (!canRequestInternal && !canRequestExternal) return null;
                
                return (
                  <div className="flex flex-col gap-1 mt-2">
                    {canRequestInternal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)}
                        className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs"
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Ajuste Interno
                      </Button>
                    )}
                    {canRequestExternal && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)}
                          className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs"
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          Solicitar Ajuste
                        </Button>
                        {canMarkComplete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsComplete(demand.id);
                            }}
                            className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar como Concluída
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

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
                    {formatDateOnlyBR(demand.due_date) || ""}
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
  const renderColumnContent = (columnKey: string, showMoveMenu: boolean = false, columnAdjustmentType?: AdjustmentTypeColumn) => {
    const columnDemands = getDemandsForColumn(columnKey);
    const adjType = columnAdjustmentType || columns.find(c => c.key === columnKey)?.adjustmentType || 'none';
    
    return (
      <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
        {columnDemands.map((demand) => renderDemandCard(demand, columnKey, showMoveMenu, adjType))}
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
    const mobileActiveColumn = activeColumns[0];
    const activeColumnData = mobileActiveColumn ? columns.find(c => c.key === mobileActiveColumn) : null;
    
    const handleMobileColumnChange = (value: string) => {
      setActiveColumns([value]);
    };
    
    return (
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <Select value={mobileActiveColumn || ""} onValueChange={handleMobileColumnChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma coluna">
                {activeColumnData ? (
                  <div className="flex items-center justify-between w-full">
                    <span>{activeColumnData.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {getDemandsForColumn(mobileActiveColumn!).length}
                    </Badge>
                  </div>
                ) : (
                  "Selecione uma coluna"
                )}
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

        {activeColumnData && mobileActiveColumn ? (
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
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-sm">Selecione uma coluna para visualizar as demandas</p>
          </div>
        )}

        <KanbanAdjustmentDialog
          open={adjustmentDialogOpen}
          onOpenChange={handleAdjustmentDialogChange}
          demandId={adjustmentDemandId}
          demandTitle={adjustmentDemand?.title}
          demandCreatedBy={adjustmentDemand?.created_by}
          teamId={adjustmentDemand?.team_id}
          boardId={boardId || null}
          boardName={boardName}
        />
      </div>
    );
  }

  // Tablet/Small desktop view - fixed width columns with horizontal scroll
  if (isTabletOrSmallDesktop) {
    const closedColumnMinWidth = 48; // px - minimum width for closed columns
    const openColumnWidth = 360; // px - fixed width for open columns (increased for full timer display)
    
    return (
      <div className="flex flex-col h-full gap-2">
        {/* Horizontal scroll container - closed columns always flex to fill remaining space */}
        <div className="flex gap-2 h-full min-h-0 overflow-x-auto pb-2 kanban-scroll">
          {columns.map((column) => {
            const isActive = activeColumns.includes(column.key);
            const columnDemands = getDemandsForColumn(column.key);
            const isDragTarget = dragOverColumn === column.key && draggedId;
            const colorStyle = getColumnBackgroundStyle(column.color);
            
            return (
              <div
                key={column.key}
                style={{
                  ...(isActive ? {
                    width: `${openColumnWidth}px`,
                    minWidth: `${openColumnWidth}px`,
                    flexShrink: 0,
                  } : {
                    minWidth: `${closedColumnMinWidth}px`,
                    flex: 1,
                  }),
                  ...colorStyle.style,
                }}
                className={cn(
                  "rounded-lg flex flex-col min-h-0 overflow-hidden",
                  "transition-all duration-300 ease-out",
                  colorStyle.className,
                  isActive ? "p-4" : "p-2 cursor-pointer hover:opacity-80",
                  isDragTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                onClick={() => toggleColumn(column.key)}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {isActive ? (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground truncate">
                        {column.label}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {columnDemands.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleColumn(column.key);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
          demandCreatedBy={adjustmentDemand?.created_by}
          teamId={adjustmentDemand?.team_id}
          boardId={boardId || null}
          boardName={boardName}
        />
      </div>
    );
  }

  // Large Desktop view - fixed width columns with horizontal scroll (carousel style)
  if (isLargeDesktop) {
    const closedColumnMinWidth = 56; // px - minimum width for closed columns
    const openColumnWidth = 380; // px - fixed width for open columns (increased for full timer display)

    return (
      <div className="flex flex-col h-full gap-2">
        {/* Horizontal scroll container - carousel style, closed columns always flex to fill remaining space */}
        <div className="flex gap-2 h-full min-h-0 overflow-x-auto pb-2 kanban-scroll">
          {columns.map((column) => {
            const isActive = activeColumns.includes(column.key);
            const columnDemands = getDemandsForColumn(column.key);
            const isDragTarget = dragOverColumn === column.key && draggedId;
            const colorStyle = getColumnBackgroundStyle(column.color);
            
            return (
              <div
                key={column.key}
                style={{
                  ...(isActive ? {
                    width: `${openColumnWidth}px`,
                    minWidth: `${openColumnWidth}px`,
                    flexShrink: 0,
                  } : {
                    minWidth: `${closedColumnMinWidth}px`,
                    flex: 1,
                  }),
                  ...colorStyle.style,
                }}
                className={cn(
                  "rounded-lg flex flex-col min-h-0 overflow-hidden",
                  "transition-all duration-300 ease-out",
                  colorStyle.className,
                  isActive ? "p-4" : "p-2 cursor-pointer hover:opacity-80",
                  isDragTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                onClick={() => toggleColumn(column.key)}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {isActive ? (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground truncate">
                        {column.label}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {columnDemands.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleColumn(column.key);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
          demandCreatedBy={adjustmentDemand?.created_by}
          teamId={adjustmentDemand?.team_id}
          boardId={boardId || null}
          boardName={boardName}
        />
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
