import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KanbanColumnToolbar, KanbanSortOption, filterAndSortDemands } from "@/components/KanbanColumnToolbar";
import { format } from "date-fns";
import { formatDateOnlyBR, isDateOverdue } from "@/lib/dateUtils";
import { cn, truncateText } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errorUtils";
import { formatDemandCode } from "@/lib/demandCodeUtils";
import { useUpdateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { extractPlainText } from "@/components/ui/rich-text-editor";
import { KanbanTimeDisplay } from "@/components/KanbanTimeDisplay";
import { KanbanParentTimeDisplay } from "@/components/KanbanParentTimeDisplay";
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
import { buildPublicDemandUrl } from "@/lib/demandShareUtils";
import { KanbanSubdemandsList } from "@/components/KanbanSubdemandsList";
import { checkDependencyBeforeStatusChange, useBatchDependencyInfo } from "@/hooks/useDependencyCheck";
import { Link2, Lock } from "lucide-react";

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
  status_changed_at?: string | null;
  status_changed_by?: string | null;
  time_in_progress_seconds?: number | null;
  last_started_at?: string | null;
  team_id?: string;
  board_id?: string;
  board_sequence_number?: number | null;
  service_id?: string | null;
  parent_demand_id?: string | null;
  demand_statuses?: { name: string; color: string } | null;
  profiles?: { full_name: string; avatar_url?: string | null } | null;
  assigned_profile?: { full_name: string; avatar_url?: string | null } | null;
  status_changed_by_profile?: { full_name: string; avatar_url?: string | null } | null;
  teams?: { name: string } | null;
  boards?: { id: string; name: string } | null;
  services?: { id: string; name: string } | null;
  demand_assignees?: Assignee[];
  _isOffline?: boolean;
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
  boardId?: string;
  initialColumnsOpen?: boolean;
  showBoardBadge?: boolean; // Show board name badge on each card
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

export function KanbanBoard({ demands, columns: propColumns, onDemandClick, readOnly = false, userRole, boardName, boardId, initialColumnsOpen = false, showBoardBadge = false }: KanbanBoardProps) {
  // Use provided columns or fallback to default
  const allColumns = propColumns && propColumns.length > 0 ? propColumns : DEFAULT_COLUMNS;
  
  // Hide "Tarefas Internas" from requesters
  const columns = useMemo(() => {
    if (userRole === "requester") {
      return allColumns.filter(col => col.key !== "Tarefas Internas");
    }
    return allColumns;
  }, [allColumns, userRole]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isTabletOrSmallDesktop = useIsTabletOrSmallDesktop();
  const isLargeDesktop = useIsLargeDesktop();
  const { isOffline } = useOfflineStatus();
  const queryClient = useQueryClient();
  
  // Track multiple active columns, using array to maintain order (FIFO)
  // Initialize based on user preference
  const [activeColumns, setActiveColumns] = useState<string[]>(() => {
    if (initialColumnsOpen) {
      return propColumns?.map(c => c.key) || DEFAULT_COLUMNS.map(c => c.key);
    }
    return [];
  });
  
  // Update active columns when initialColumnsOpen changes or columns change
  useEffect(() => {
    if (initialColumnsOpen) {
      const allColumnKeys = columns.map(c => c.key);
      setActiveColumns(allColumnKeys);
    } else {
      setActiveColumns([]);
    }
  }, [initialColumnsOpen]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentDemandId, setAdjustmentDemandId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, string>>({});
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [columnSorts, setColumnSorts] = useState<Record<string, KanbanSortOption>>({});
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();
  
  const demandIds = useMemo(() => demands.map(d => d.id), [demands]);
  const { data: adjustmentCounts } = useAdjustmentCounts(demandIds);
  const { data: batchDeps } = useBatchDependencyInfo(demandIds);

  // Build a lookup map for parent demands from the same data set
  const parentDemandMap = useMemo(() => {
    const map: Record<string, { id: string; title: string; board_sequence_number: number | null; description: string | null }> = {};
    for (const d of demands) {
      map[d.id] = { id: d.id, title: d.title, board_sequence_number: d.board_sequence_number || null, description: d.description || null };
    }
    return map;
  }, [demands]);

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
        queryClient.invalidateQueries({ queryKey: ["active-timer-demands"] });
        queryClient.invalidateQueries({ queryKey: ["board-time-entries"] });
        queryClient.invalidateQueries({ queryKey: ["kanban-parent-time"] });
        queryClient.invalidateQueries({ queryKey: ["subdemands-time-entries"] });
        
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

  // Helper function to start a time entry for a demand when moved to "Fazendo"
  const startTimerForDemand = useCallback(async (demandId: string) => {
    if (!user) return;
    
    try {
      // Check if there's already an active timer for this user on this demand
      const { data: existingActive } = await supabase
        .from("demand_time_entries")
        .select("id")
        .eq("demand_id", demandId)
        .eq("user_id", user.id)
        .is("ended_at", null)
        .limit(1);

      if (existingActive && existingActive.length > 0) return; // Already tracking

      // Stop any other active timer the user has on ANY demand
      const { data: otherActive } = await supabase
        .from("demand_time_entries")
        .select("id, started_at")
        .eq("user_id", user.id)
        .is("ended_at", null);

      if (otherActive && otherActive.length > 0) {
        for (const entry of otherActive) {
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - new Date(entry.started_at).getTime()) / 1000);
          await supabase
            .from("demand_time_entries")
            .update({ ended_at: now.toISOString(), duration_seconds: durationSeconds })
            .eq("id", entry.id);
        }
      }

      // Start new timer
      await supabase
        .from("demand_time_entries")
        .insert({
          demand_id: demandId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["demand-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-demand-time", demandId] });
      queryClient.invalidateQueries({ queryKey: ["active-timer-demands"] });
      queryClient.invalidateQueries({ queryKey: ["user-demand-time"] });
      queryClient.invalidateQueries({ queryKey: ["user-active-timer"] });
      queryClient.invalidateQueries({ queryKey: ["board-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-parent-time"] });
      queryClient.invalidateQueries({ queryKey: ["subdemands-time-entries"] });

      toast.info("Timer iniciado automaticamente", {
        description: "O timer foi iniciado pois a demanda entrou em andamento",
      });
    } catch (error) {
      console.error("Error starting timer:", error);
    }
  }, [user, queryClient]);
  
  // Helper: auto-move parent demand to "Fazendo" when a sub-demand moves there (no timer on parent)
  const autoMoveParentToFazendo = useCallback(async (demandId: string) => {
    // Fetch demand directly to avoid stale closure data
    const { data: demand } = await supabase
      .from("demands")
      .select("id, parent_demand_id")
      .eq("id", demandId)
      .single();
    
    if (!demand?.parent_demand_id) return;
    
    const { data: parentDemand } = await supabase
      .from("demands")
      .select("id, status_id, demand_statuses(name)")
      .eq("id", demand.parent_demand_id)
      .single();
    
    if (!parentDemand) return;
    
    const parentStatusName = (parentDemand.demand_statuses as any)?.name;
    if (parentStatusName === "Fazendo") return; // Already in Fazendo
    
    // Find "Fazendo" status for the parent's board
    const fazendoStatus = statuses?.find(s => s.name === "Fazendo");
    if (!fazendoStatus) return;
    
    // Move parent to "Fazendo" without starting a timer
    updateDemand.mutate({
      id: demand.parent_demand_id,
      status_id: fazendoStatus.id,
      status_changed_by: user?.id || null,
      status_changed_at: new Date().toISOString(),
    });
  }, [statuses, updateDemand, user]);

  // Helper: when a sub-demand leaves "Fazendo", check if all siblings are also out, then move parent back
  const autoCheckParentStatus = useCallback(async (demandId: string, newStatusKey: string) => {
    // Fetch demand directly to avoid stale closure data
    const { data: demand } = await supabase
      .from("demands")
      .select("id, parent_demand_id")
      .eq("id", demandId)
      .single();
    
    if (!demand?.parent_demand_id) return;
    
    // If the sub-demand is moving TO Fazendo, auto-move parent
    if (newStatusKey === "Fazendo") {
      await autoMoveParentToFazendo(demandId);
      return;
    }
    
    // Fetch all siblings from DB
    const { data: siblings } = await supabase
      .from("demands")
      .select("id, demand_statuses(name)")
      .eq("parent_demand_id", demand.parent_demand_id)
      .neq("id", demandId);

    const anySiblingActive = (siblings || []).some(s => {
      const name = (s.demand_statuses as any)?.name;
      return name === "Fazendo" || name === "Em Ajuste";
    });
    
    // Only auto-move parent OUT of "Fazendo" if no siblings are active
    // Do NOT auto-move parent to "Entregue" — parent may need other stages (adjustment, approval, etc.)
    if (!anySiblingActive && newStatusKey !== "Fazendo" && newStatusKey !== "Em Ajuste") {
      // No automatic parent status change — leave it for manual control
    }
  }, [statuses, updateDemand, user, autoMoveParentToFazendo]);

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

    const { data: childDemands } = await supabase
      .from("demands")
      .select("id, demand_statuses(name)")
      .eq("parent_demand_id", demandId)
      .eq("archived", false);

    const isParentDemandByDb = (childDemands?.length || 0) > 0;

    if (columnKey === "Entregue" && isParentDemandByDb) {
      const hasUndeliveredSubdemand = (childDemands || []).some((child) => (child.demand_statuses as any)?.name !== "Entregue");
      if (hasUndeliveredSubdemand) {
        toast.error("Finalização bloqueada", {
          description: "Esta demanda possui subdemandas pendentes. Conclua todas as subdemandas antes de finalizar.",
        });
        return;
      }
    }

    // Check dependency before allowing status change (except going back to "A Iniciar")
    if (columnKey !== "A Iniciar" && previousStatusName === "A Iniciar") {
      const depCheck = await checkDependencyBeforeStatusChange(demandId);
      if (depCheck.blocked) {
        toast.error("Não é possível alterar o status", {
          description: `Esta demanda depende de "${depCheck.blockedByTitle}" que ainda não foi concluída.`,
        });
        return;
      }
    }

    // Adicionar a aba de destino às abertas no modo desktop grande para acompanhar o card
    if (isLargeDesktop && !activeColumns.includes(columnKey)) {
      toggleColumn(columnKey);
    } else if (isTabletOrSmallDesktop) {
      setActiveColumns([columnKey]);
    }

    // Apply optimistic update immediately for smooth UX (especially offline)
    setOptimisticUpdates(prev => ({ ...prev, [demandId]: columnKey }));

    const isAdjustmentCompletion = previousStatusName === "Em Ajuste" && columnKey === "Aprovação do Cliente";

    // Check if this demand is a parent (has children) - parents don't get their own timers
    const isParentDemand = demands.some(d => d.parent_demand_id === demandId);

    // Stop timer when leaving "Fazendo" or "Em Ajuste" for any other status
    const timerStatuses = ["Fazendo", "Em Ajuste"];
    if (!isParentDemand && previousStatusName && timerStatuses.includes(previousStatusName) && !timerStatuses.includes(columnKey)) {
      await stopAllTimersForDemand(demandId);
    }

    // Start timer automatically when moving to "Fazendo" (skip for parent demands)
    if (columnKey === "Fazendo" && previousStatusName !== "Fazendo" && !isParentDemand) {
      await startTimerForDemand(demandId);
    }

    updateDemand.mutate(
      {
        id: demandId,
        status_id: statusId,
        status_changed_by: user?.id || null,
        status_changed_at: new Date().toISOString(),
      },
      {
        onSuccess: async () => {
          // Invalidate and THEN clear optimistic update to prevent visual duplication
           await queryClient.invalidateQueries({ queryKey: ['demands'] });
          queryClient.invalidateQueries({ queryKey: ['subdemands'] });
          
          // Auto-move parent status based on sub-demand changes
          await autoCheckParentStatus(demandId, columnKey);
          
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });

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
                const publicUrl = await buildPublicDemandUrl(demand.id, user?.id || "");
                await supabase.functions.invoke("send-email", {
                  body: {
                    to: demand.created_by,
                    subject: `${statusEmoji} Status atualizado: ${demand.title}`,
                    template: "notification",
                    templateData: {
                      title: "Status da Demanda Atualizado",
                      message: `A demanda "${demand.title}" mudou de "${previousStatusName}" para "${columnKey}".`,
                      actionUrl: publicUrl,
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
              // Fetch admin IDs from board for push notification
              const adminIds: string[] = [];
              if (boardId) {
                const { data: admins } = await supabase
                  .from("board_members")
                  .select("user_id")
                  .eq("board_id", boardId)
                  .eq("role", "admin");
                if (admins) adminIds.push(...admins.map(a => a.user_id));
              }
              // Send push notification to creator + admins
              sendAdjustmentCompletionPushNotification({
                creatorId: demand.created_by,
                adminIds,
                demandId: demand.id,
                demandTitle: demand.title,
                boardName,
              }).catch(err => console.error("Erro ao enviar push de ajuste concluído:", err));
            }
          }
        },
        onError: (error: any) => {
          // Rollback optimistic update on error
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
    // Check dependency before allowing status change
    const demand = demands.find(d => d.id === demandId);
    const previousStatusName = demand?.demand_statuses?.name;

    const { data: childDemands } = await supabase
      .from("demands")
      .select("id, demand_statuses(name)")
      .eq("parent_demand_id", demandId)
      .eq("archived", false);

    const isParentDemandByDb = (childDemands?.length || 0) > 0;
    if (newStatusKey === "Entregue" && isParentDemandByDb) {
      const hasUndeliveredSubdemand = (childDemands || []).some((child) => (child.demand_statuses as any)?.name !== "Entregue");
      if (hasUndeliveredSubdemand) {
        toast.error("Finalização bloqueada", {
          description: "Esta demanda possui subdemandas pendentes. Conclua todas as subdemandas antes de finalizar.",
        });
        return;
      }
    }

    if (newStatusKey !== "A Iniciar" && previousStatusName === "A Iniciar") {
      const depCheck = await checkDependencyBeforeStatusChange(demandId);
      if (depCheck.blocked) {
        toast.error("Não é possível alterar o status", {
          description: `Esta demanda depende de "${depCheck.blockedByTitle}" que ainda não foi concluída.`,
        });
        return;
      }
    }

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

    const demandObj = demands.find((d) => d.id === demandId);
    const prevStatusName = demandObj?.demand_statuses?.name;
    
    if (prevStatusName === newStatusKey) return;

    // Apply optimistic update immediately
    setOptimisticUpdates(prev => ({ ...prev, [demandId]: newStatusKey }));

    const isAdjustmentCompletion = prevStatusName === "Em Ajuste" && newStatusKey === "Aprovação do Cliente";

    // Check if this demand is a parent (has children) - parents don't get their own timers
    const isParentDemandMobile = demands.some(d => d.parent_demand_id === demandId);

    // Stop timer when leaving "Fazendo" or "Em Ajuste" for any other status
    const timerStatuses = ["Fazendo", "Em Ajuste"];
    if (!isParentDemandMobile && prevStatusName && timerStatuses.includes(prevStatusName) && !timerStatuses.includes(newStatusKey)) {
      await stopAllTimersForDemand(demandId);
    }

    // Start timer automatically when moving to "Fazendo" (skip for parent demands)
    if (newStatusKey === "Fazendo" && prevStatusName !== "Fazendo" && !isParentDemandMobile) {
      await startTimerForDemand(demandId);
    }

    updateDemand.mutate(
      {
        id: demandId,
        status_id: targetStatusId,
      },
      {
        onSuccess: async () => {
          // Invalidate and THEN clear optimistic update to prevent visual duplication
          await queryClient.invalidateQueries({ queryKey: ['demands'] });
          
          // Auto-move parent status based on sub-demand changes
          await autoCheckParentStatus(demandId, newStatusKey);
          
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });

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
                const publicUrl = await buildPublicDemandUrl(demand.id, user?.id || "");
                await supabase.functions.invoke("send-email", {
                  body: {
                    to: demand.created_by,
                    subject: `${statusEmoji} Status atualizado: ${demand.title}`,
                    template: "notification",
                    templateData: {
                      title: "Status da Demanda Atualizado",
                      message: `A demanda "${demand.title}" mudou de "${previousStatusName}" para "${newStatusKey}".`,
                      actionUrl: publicUrl,
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
              const adminIds: string[] = [];
              if (boardId) {
                const { data: admins } = await supabase
                  .from("board_members")
                  .select("user_id")
                  .eq("board_id", boardId)
                  .eq("role", "admin");
                if (admins) adminIds.push(...admins.map(a => a.user_id));
              }
              sendAdjustmentCompletionPushNotification({
                creatorId: demand.created_by,
                adminIds,
                demandId: demand.id,
                demandTitle: demand.title,
                boardName,
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

  // Pre-compute demand-to-column mapping for deduplication
  // Each demand is assigned to exactly one column (optimistic update takes priority)
  const demandColumnMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of demands) {
      const optimisticStatus = optimisticUpdates[d.id];
      const columnKey = optimisticStatus || d.demand_statuses?.name;
      if (columnKey && !map.has(d.id)) {
        map.set(d.id, columnKey);
      }
    }
    return map;
  }, [demands, optimisticUpdates]);

  // Get demands for column - idempotent, can be called multiple times safely
  const getDemandsForColumn = useCallback((columnKey: string) => {
    return demands.filter((d) => demandColumnMap.get(d.id) === columnKey);
  }, [demands, demandColumnMap]);

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

    // Check dependency before allowing completion
    const depCheck = await checkDependencyBeforeStatusChange(demandId);
    if (depCheck.blocked) {
      toast.error("Não é possível alterar o status", {
        description: `Esta demanda depende de "${depCheck.blockedByTitle}" que ainda não foi concluída.`,
      });
      return;
    }
    
    // Stop any active timers
    await stopAllTimersForDemand(demandId);
    
    // Apply optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [demandId]: "Entregue" }));
    
    updateDemand.mutate(
      { id: demandId, status_id: entregueStatus.id, status_changed_by: user?.id || null, status_changed_at: new Date().toISOString() },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ['demands'] });
          
          // Auto-move parent status based on sub-demand changes
          await autoCheckParentStatus(demandId, "Entregue");
          
          setOptimisticUpdates(prev => {
            const newUpdates = { ...prev };
            delete newUpdates[demandId];
            return newUpdates;
          });
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
  }, [statuses, demands, stopAllTimersForDemand, startTimerForDemand, updateDemand, queryClient, isOffline, user, autoCheckParentStatus]);

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
    const demandDeps = batchDeps?.[demand.id] || [];
    const isBlocked = demandDeps.some(d => d.isBlocked);
    const isDelivered = columnKey === "Entregue";
    const showDragHandle = !readOnly && !isMobile && !isDelivered;
    const currentStatus = demand.demand_statuses?.name;
    const availableStatuses = columns.filter(col => col.key !== currentStatus);
    const hasPendingSync = !!optimisticUpdates[demand.id];
    const isOfflineDemand = (demand as Demand)._isOffline === true;
    const showOfflineIndicator = hasPendingSync || isOfflineDemand;
    const colAdjType = columnAdjustmentType || columns.find(c => c.key === columnKey)?.adjustmentType || 'none';
    
    // Determine if this is a parent demand (has children in the dataset)
    const childDemandIds = demands.filter(d => d.parent_demand_id === demand.id).map(d => d.id);
    const isParentDemand = childDemandIds.length > 0;
    // Determine if this is a sub-demand
    const isSubDemand = !!demand.parent_demand_id;

    // ─── SUB-DEMAND: compact card ───
    if (isSubDemand) {
      const parent = demand.parent_demand_id ? parentDemandMap[demand.parent_demand_id] : null;
      return (
        <Card
          key={demand.id}
          draggable={false}
          className={cn(
            "transition-all cursor-pointer group relative overflow-hidden",
            "hover:shadow-sm",
            draggedId === demand.id && "opacity-50 scale-95",
            showOfflineIndicator && "ring-2 ring-amber-500/50",
          )}
        >
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-start gap-2">
              {showDragHandle && (
                <div
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, demand.id); }}
                  onDragEnd={handleDragEnd}
                  onMouseDown={handleDragHandleMouseDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center rounded-md p-1 -ml-0.5 mt-0.5 bg-primary/10 hover:bg-primary/20 cursor-grab active:cursor-grabbing transition-all opacity-80 group-hover:opacity-100 touch-none select-none"
                  title="Arraste para mover"
                >
                  <GripVertical className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              {showMoveMenu && !readOnly && !isDelivered && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 -ml-0.5 bg-primary/10 hover:bg-primary/20" onClick={(e) => e.stopPropagation()}>
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background">
                    {availableStatuses.map((status) => (
                      <DropdownMenuItem key={status.key} onClick={(e) => { e.stopPropagation(); handleMobileStatusChange(demand.id, status.key); }} className="cursor-pointer">
                        <div className={cn("w-2 h-2 rounded-full mr-2", status.color.replace('/10', ''))} />
                        Mover para {status.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex-1 min-w-0" onClick={() => onDemandClick(demand.id)}>
                {/* Code + label row */}
                <div className="flex items-center gap-1.5 mb-1">
                  {demand.board_sequence_number && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono px-1.5 py-0 h-[18px]">
                      {formatDemandCode(demand.board_sequence_number)}
                    </Badge>
                  )}
                  <span className="text-[10px] text-primary/60 font-medium uppercase tracking-wider">Subdemanda</span>
                </div>
                <h4 className="font-medium text-xs line-clamp-2 mb-1 break-words">{truncateText(demand.title, 60)}</h4>
                
                {/* Compact badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {demand.priority && (
                    <Badge variant="outline" className={cn("text-[10px] capitalize px-1.5 py-0 h-[18px]", priorityColors[demand.priority] || "bg-muted text-muted-foreground")}>
                      {demand.priority}
                    </Badge>
                  )}
                  {demand.services?.name && (
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 px-1.5 py-0 h-[18px] gap-0.5">
                      <Wrench className="h-2.5 w-2.5" />
                      {demand.services.name}
                    </Badge>
                  )}
                  {adjustmentCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20 px-1.5 py-0 h-[18px]">
                      <RefreshCw className="h-2.5 w-2.5 mr-0.5" />{adjustmentCount}
                    </Badge>
                  )}
                </div>

                {/* Blocked indicator */}
                {demandDeps.length > 0 && isBlocked && (
                  <div className="rounded-md bg-red-500/10 px-2 py-1 flex items-center gap-1 mb-2">
                    <Lock className="h-2.5 w-2.5 text-red-500 shrink-0" />
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-medium truncate">
                      Aguardando: {demandDeps.find(d => d.isBlocked)?.dependsOnTitle}
                    </span>
                  </div>
                )}

                {/* Time display */}
                {(columnKey === "Entregue" || columnKey === "Aprovação do Cliente" || columnKey === "Fazendo" || columnKey === "Em Ajuste") && (() => {
                  const canControlTimer = !readOnly && 
                    (userRole === "admin" || userRole === "moderator" || userRole === "executor") &&
                    (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                  const shouldForceShow = canControlTimer && (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                  return (
                    <KanbanTimeDisplay demandId={demand.id} canControl={canControlTimer} forceShow={shouldForceShow} hideIfHasSubdemands />
                  );
                })()}

                {/* Adjustment buttons */}
                {colAdjType !== 'none' && (() => {
                  const canRequestInternal = colAdjType === 'internal' && (userRole === "admin" || userRole === "moderator");
                  const canRequestExternal = colAdjType === 'external' && userRole === "requester";
                  const canMarkComplete = colAdjType === 'external' && userRole === "requester";
                  if (!canRequestInternal && !canRequestExternal) return null;
                  return (
                    <div className="flex flex-col gap-1 mt-1.5">
                      {canRequestInternal && (
                        <Button variant="outline" size="sm" onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)} className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 text-[10px] h-7">
                          <Wrench className="h-2.5 w-2.5 mr-1" />Ajuste Interno
                        </Button>
                      )}
                      {canRequestExternal && (
                        <>
                          <Button variant="outline" size="sm" onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)} className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-[10px] h-7">
                            <Wrench className="h-2.5 w-2.5 mr-1" />Solicitar Ajuste
                          </Button>
                          {canMarkComplete && (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleMarkAsComplete(demand.id); }} className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-[10px] h-7">
                              <Check className="h-2.5 w-2.5 mr-1" />Concluída
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Footer row: status changed info + due date + assignees */}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {demand.status_changed_at && (
                      <div className="flex items-center gap-1">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-default">
                                <ArrowRight className="h-2.5 w-2.5" />
                                {formatDateOnlyBR(demand.status_changed_at)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Entrou nesta etapa em {format(new Date(demand.status_changed_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {demand.status_changed_by_profile && (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-4 w-4 cursor-default ring-1 ring-primary/30">
                                  <AvatarImage src={demand.status_changed_by_profile.avatar_url || undefined} alt={demand.status_changed_by_profile.full_name} />
                                  <AvatarFallback className="text-[6px] bg-primary/10 text-primary">
                                    {demand.status_changed_by_profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Movido por {demand.status_changed_by_profile.full_name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                    {demand.due_date && (
                      <div className={cn("flex items-center gap-0.5 text-[10px] cursor-default", isOverdue(demand.due_date) && columnKey !== "Entregue" ? "text-destructive" : "text-muted-foreground")}>
                        {isOverdue(demand.due_date) && columnKey !== "Entregue" ? <Clock className="h-2.5 w-2.5" /> : <Calendar className="h-2.5 w-2.5" />}
                        {formatDateOnlyBR(demand.due_date)}
                      </div>
                    )}
                  </div>
                  {assignees.length > 0 ? (
                    <AssigneeAvatars assignees={assignees} size="sm" maxVisible={2} />
                  ) : demand.assigned_profile ? (
                    <AssigneeAvatars assignees={[{ user_id: "legacy", profile: { full_name: demand.assigned_profile.full_name, avatar_url: demand.assigned_profile.avatar_url || null } }]} size="sm" />
                  ) : null}
                </div>

                {/* Parent reference */}
                {parent && (
                  <div
                    className="mt-2 rounded border border-primary/15 bg-primary/[0.04] px-2 py-1.5 cursor-pointer hover:bg-primary/[0.08] transition-colors"
                    onClick={(e) => { e.stopPropagation(); onDemandClick(parent.id); }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-primary/50 font-medium uppercase tracking-wider">Demanda pai</span>
                      {parent.board_sequence_number && (
                        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 font-mono px-1 py-0 h-[14px]">
                          {formatDemandCode(parent.board_sequence_number)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-medium mt-0.5 line-clamp-1 text-foreground/80">{parent.title}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // ─── PARENT DEMAND: distinctive card ───
    // ─── REGULAR DEMAND: standard card ───
    return (
      <Card
        key={demand.id}
        draggable={false}
        className={cn(
          "hover:shadow-md transition-all cursor-pointer group relative",
          draggedId === demand.id && "opacity-50 scale-95",
          showOfflineIndicator && "ring-2 ring-amber-500/50 bg-amber-500/5",
          isParentDemand && "bg-primary/[0.04] dark:bg-primary/[0.08] ring-1 ring-primary/15 shadow-sm",
        )}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            {showDragHandle && (
              <div
                draggable
                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, demand.id); }}
                onDragEnd={handleDragEnd}
                onMouseDown={handleDragHandleMouseDown}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex items-center justify-center rounded-md p-1.5 -ml-1 mt-0.5",
                  "bg-primary/10 hover:bg-primary/20 cursor-grab active:cursor-grabbing",
                  "transition-all duration-200 opacity-80 group-hover:opacity-100 touch-none select-none"
                )}
                title="Arraste para mover"
              >
                <GripVertical className="h-4 w-4 text-primary" />
              </div>
            )}
            
            {showMoveMenu && !readOnly && !isDelivered && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 mt-0.5 bg-primary/10 hover:bg-primary/20" onClick={(e) => e.stopPropagation()}>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background">
                  {availableStatuses.map((status) => (
                    <DropdownMenuItem key={status.key} onClick={(e) => { e.stopPropagation(); handleMobileStatusChange(demand.id, status.key); }} className="cursor-pointer">
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
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                {demand.board_sequence_number && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/20 font-mono">
                          {formatDemandCode(demand.board_sequence_number)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Código único da demanda</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {isParentDemand && (
                  <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/25 px-1.5 py-0 h-[18px] font-semibold" variant="outline">
                    Demanda Principal · {childDemandIds.length} sub
                  </Badge>
                )}
                {showBoardBadge && demand.boards?.name && (
                  <Badge variant="outline" className="text-xs bg-accent/50 text-accent-foreground border-accent-foreground/20">
                    {demand.boards.name}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm line-clamp-2 mb-1 break-words overflow-hidden" title={demand.title}>
                {truncateText(demand.title, 80)}
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
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse" title={t("sync.offlineDescription")}>
                    <CloudOff className="h-3 w-3 mr-1" />{t("sync.offlinePending")}
                  </Badge>
                )}
                
                {demand.priority && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn("text-xs capitalize", priorityColors[demand.priority] || "bg-muted text-muted-foreground")}>
                          {demand.priority}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Nível de prioridade da demanda</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {demand.services?.name && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
                          <Wrench className="h-3 w-3" />{demand.services.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Serviço vinculado à demanda</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {adjustmentCount > 0 && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                          <RefreshCw className="h-3 w-3 mr-1" />{adjustmentCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Quantidade de ajustes realizados</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {columnKey === "Em Ajuste" && latestAdjustmentType && (
                  <Badge variant="outline" className={cn("text-xs", latestAdjustmentType === "internal" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20")}>
                    {latestAdjustmentType === "internal" ? "Interno" : "Externo"}
                  </Badge>
                )}
              </div>
              
              {demandDeps.length > 0 && isBlocked && (
                <div className="rounded-md bg-red-500/10 px-2.5 py-1.5 flex items-center gap-1.5 mb-2">
                  <Lock className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    Aguardando demanda '{demandDeps.find(d => d.isBlocked)?.dependsOnTitle}' ser concluída
                  </span>
                </div>
              )}

              {(columnKey === "Entregue" || columnKey === "Aprovação do Cliente" || columnKey === "Fazendo" || columnKey === "Em Ajuste") && (() => {
                if (isParentDemand) {
                  return <KanbanParentTimeDisplay demandId={demand.id} subdemandIds={childDemandIds} />;
                }
                const canControlTimer = !readOnly && 
                  (userRole === "admin" || userRole === "moderator" || userRole === "executor") &&
                  (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                const shouldForceShow = canControlTimer && (columnKey === "Fazendo" || columnKey === "Em Ajuste");
                return <KanbanTimeDisplay demandId={demand.id} canControl={canControlTimer} forceShow={shouldForceShow} hideIfHasSubdemands />;
              })()}

              {colAdjType !== 'none' && (() => {
                const canRequestInternal = colAdjType === 'internal' && (userRole === "admin" || userRole === "moderator");
                const canRequestExternal = colAdjType === 'external' && userRole === "requester";
                const canMarkComplete = colAdjType === 'external' && userRole === "requester";
                if (!canRequestInternal && !canRequestExternal) return null;
                return (
                  <div className="flex flex-col gap-1 mt-2">
                    {canRequestInternal && (
                      <Button variant="outline" size="sm" onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)} className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs">
                        <Wrench className="h-3 w-3 mr-1" />Ajuste Interno
                      </Button>
                    )}
                    {canRequestExternal && (
                      <>
                        <Button variant="outline" size="sm" onClick={(e) => handleOpenAdjustmentDialog(e, demand.id)} className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs">
                          <Wrench className="h-3 w-3 mr-1" />Solicitar Ajuste
                        </Button>
                        {canMarkComplete && (
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleMarkAsComplete(demand.id); }} className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs">
                            <Check className="h-3 w-3 mr-1" />Marcar como Concluída
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {demand.status_changed_at && (
                    <div className="flex items-center gap-1">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-default">
                              <ArrowRight className="h-3 w-3" />
                              {formatDateOnlyBR(demand.status_changed_at)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Entrou nesta etapa em {format(new Date(demand.status_changed_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {demand.status_changed_by_profile && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-5 w-5 cursor-default ring-1 ring-primary/30 hover:scale-100">
                                <AvatarImage src={demand.status_changed_by_profile.avatar_url || undefined} alt={demand.status_changed_by_profile.full_name} />
                                <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                  {demand.status_changed_by_profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Movido para esta etapa por {demand.status_changed_by_profile.full_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                  {demand.due_date && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("flex items-center gap-1 text-xs cursor-default", isOverdue(demand.due_date) && columnKey !== "Entregue" ? "text-destructive" : "text-muted-foreground")}>
                            {isOverdue(demand.due_date) && columnKey !== "Entregue" ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            {formatDateOnlyBR(demand.due_date) || ""}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{isOverdue(demand.due_date) && columnKey !== "Entregue" ? "Data de expiração (atrasada)" : "Data de expiração"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {assignees.length > 0 ? (
                  <AssigneeAvatars assignees={assignees} size="sm" maxVisible={2} />
                ) : demand.assigned_profile ? (
                  <AssigneeAvatars assignees={[{ user_id: "legacy", profile: { full_name: demand.assigned_profile.full_name, avatar_url: demand.assigned_profile.avatar_url || null } }]} size="sm" />
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Per-column search/sort helpers
  const getColumnSearch = useCallback((columnKey: string) => columnSearches[columnKey] || "", [columnSearches]);
  const setColumnSearch = useCallback((columnKey: string, query: string) => {
    setColumnSearches(prev => ({ ...prev, [columnKey]: query }));
  }, []);
  const getColumnSort = useCallback((columnKey: string): KanbanSortOption => columnSorts[columnKey] || "newest", [columnSorts]);
  const setColumnSort = useCallback((columnKey: string, sort: KanbanSortOption) => {
    setColumnSorts(prev => ({ ...prev, [columnKey]: sort }));
  }, []);

  // Get filtered and sorted demands for a column
  const getFilteredDemandsForColumn = useCallback((columnKey: string) => {
    const raw = getDemandsForColumn(columnKey);
    return filterAndSortDemands(raw, getColumnSearch(columnKey), getColumnSort(columnKey));
  }, [getDemandsForColumn, columnSearches, columnSorts]);

  // Render column content
  const renderColumnContent = (columnKey: string, showMoveMenu: boolean = false, columnAdjustmentType?: AdjustmentTypeColumn) => {
    const columnDemands = getFilteredDemandsForColumn(columnKey);
    const adjType = columnAdjustmentType || columns.find(c => c.key === columnKey)?.adjustmentType || 'none';
    
    return (
      <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
        {columnDemands.map((demand) => renderDemandCard(demand, columnKey, showMoveMenu, adjType))}
        {columnDemands.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            {getColumnSearch(columnKey) ? "Nenhum resultado" : (readOnly ? "Nenhuma demanda" : (isMobile ? "Nenhuma demanda" : "Arraste demandas aqui"))}
          </div>
        )}
      </div>
    );
  };

  // Render column toolbar
  const renderColumnToolbar = (columnKey: string) => (
    <KanbanColumnToolbar
      searchQuery={getColumnSearch(columnKey)}
      onSearchChange={(q) => setColumnSearch(columnKey, q)}
      sortOption={getColumnSort(columnKey)}
      onSortChange={(s) => setColumnSort(columnKey, s)}
    />
  );

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
              <div className="flex items-center gap-1.5">
                {renderColumnToolbar(mobileActiveColumn)}
                <Badge variant="secondary" className="text-xs">
                  {getDemandsForColumn(mobileActiveColumn).length}
                </Badge>
              </div>
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
          boardName={boardName}
          userRole={userRole}
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
                      <div className="flex items-center gap-1 shrink-0">
                        {renderColumnToolbar(column.key)}
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
          boardName={boardName}
          userRole={userRole}
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
                      <div className="flex items-center gap-1 shrink-0">
                        {renderColumnToolbar(column.key)}
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
                        {column.label}
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
          boardName={boardName}
          userRole={userRole}
        />
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
