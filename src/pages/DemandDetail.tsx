import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import { DemandChat } from "@/components/DemandChat";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDemandById, useCreateInteraction, useUpdateDemand } from "@/hooks/useDemands";
import { useBoardStatuses } from "@/hooks/useBoardStatuses";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useBoard } from "@/hooks/useBoards";
import { ChangeBoardDialog } from "@/components/ChangeBoardDialog";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useAuth } from "@/lib/auth";
import { useUserTimerControl } from "@/hooks/useUserTimeTracking";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { DemandEditForm } from "@/components/DemandEditForm";
import { DemandFolderPicker } from "@/components/DemandFolderPicker";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { Calendar, Users, Archive, Pencil, Wrench, AlertTriangle, LayoutGrid, List, ChevronDown, Kanban, CalendarDays, LucideIcon, Check, X, ArrowRight, UserCircle, GitBranch, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShareDemandButton } from "@/components/ShareDemandButton";
import { UserTimeTrackingDisplay } from "@/components/UserTimeTrackingDisplay";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import { formatDemandCode } from "@/lib/demandCodeUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sendAdjustmentPushNotification } from "@/hooks/useSendPushNotification";
import { useSendEmail } from "@/hooks/useSendEmail";
import { buildPublicDemandUrl } from "@/lib/demandShareUtils";
import { useRealtimeDemandDetail } from "@/hooks/useRealtimeDemandDetail";
import { DemandPresenceIndicator } from "@/components/DemandPresenceIndicator";
import { RealtimeUpdateIndicator } from "@/components/RealtimeUpdateIndicator";
import { useSubdemands, useAddSubdemand, useReorderSubdemands } from "@/hooks/useSubdemands";
import { SubdemandBadge } from "@/components/SubdemandBadge";
import { SubdemandTimer } from "@/components/SubdemandTimer";
import { CreateSubdemandDialog, type SubdemandFormData } from "@/components/CreateSubdemandDialog";
import { ParentDemandTimeDisplay } from "@/components/ParentDemandTimeDisplay";
import { checkDependencyBeforeStatusChange, useDemandDependencyInfo, useBatchDependencyInfo } from "@/hooks/useDependencyCheck";
import { Lock, Link2 } from "lucide-react";
export default function DemandDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Check origin view mode from location state
  const fromState = location.state as {
    from?: string;
    viewMode?: string;
    calendarMonth?: string;
  } | null;
  const cameFromKanban = fromState?.from === "kanban" || document.referrer.includes("/kanban");
  const demandsViewMode = fromState?.viewMode || "table";
  const calendarMonth = fromState?.calendarMonth;

  // Determine origin info for breadcrumb and back navigation
  const getOriginInfo = (): {
    label: string;
    icon: LucideIcon;
    path: string;
    viewMode?: string;
    calendarMonth?: string;
  } => {
    if (cameFromKanban) {
      return {
        label: "Kanban",
        icon: Kanban,
        path: "/kanban"
      };
    }
    switch (demandsViewMode) {
      case "calendar":
        return {
          label: "Calendário",
          icon: CalendarDays,
          path: "/demands",
          viewMode: "calendar",
          calendarMonth
        };
      case "grid":
        return {
          label: "Blocos",
          icon: LayoutGrid,
          path: "/demands",
          viewMode: "grid"
        };
      case "table":
      default:
        return {
          label: "Lista",
          icon: List,
          path: "/demands",
          viewMode: "table"
        };
    }
  };
  const originInfo = getOriginInfo();
  const backPath = originInfo.path;
  const {
    user
  } = useAuth();
  const {
    data: demand,
    isLoading,
    isError,
    error
  } = useDemandById(id);
  const {
    data: assignees
  } = useDemandAssignees(id || null);
  const {
    data: boardStatuses
  } = useBoardStatuses(demand?.board_id || null);
  const {
    data: currentBoard
  } = useBoard(demand?.board_id || null);

  // Enable realtime updates for this demand
  const {
    lastUpdate,
    showUpdateIndicator,
    clearUpdateIndicator
  } = useRealtimeDemandDetail(id);

  const createInteraction = useCreateInteraction();
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const {
    isTimerRunning,
    startTimer,
    stopTimer,
    isLoading: isTimerLoading
  } = useUserTimerControl(id);
  const sendEmail = useSendEmail();
  const { data: subdemands } = useSubdemands(id || null);
  const { data: parentDemand } = useQuery({
    queryKey: ["demand-parent", demand?.parent_demand_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("demands").select("id, title, board_sequence_number").eq("id", demand!.parent_demand_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!demand?.parent_demand_id,
  });
  const addSubdemand = useAddSubdemand();
  const reorderSubdemands = useReorderSubdemands();
  const { data: demandDeps } = useDemandDependencyInfo(id || null);
  const subdemandIds = useMemo(() => (subdemands || []).map(s => s.id), [subdemands]);
  const { data: subDepsMap } = useBatchDependencyInfo(subdemandIds);
  const [newSubdemandTitle, setNewSubdemandTitle] = useState("");
  const [showAddSubdemand, setShowAddSubdemand] = useState(false);
  const [showSubdemandDialog, setShowSubdemandDialog] = useState(false);
  const [draggedSubId, setDraggedSubId] = useState<string | null>(null);
  const [dragOverSubId, setDragOverSubId] = useState<string | null>(null);

  const handleReorderSubdemand = async (targetId: string) => {
    const sourceId = draggedSubId;
    setDraggedSubId(null);
    setDragOverSubId(null);
    if (!sourceId || sourceId === targetId || !subdemands || !id) return;
    const ids = subdemands.map((s) => s.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    try {
      await reorderSubdemands.mutateAsync({ parentDemandId: id, orderedIds: next });
    } catch {
      toast.error("Não foi possível reordenar as subdemandas");
    }
  };

  const [editingAssignees, setEditingAssignees] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isChangeBoardDialogOpen, setIsChangeBoardDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const { selectedBoardId, setSelectedBoardId } = useSelectedBoard();

  // Auto-switch board context to match the demand being viewed (only on initial mount)
  const demandBoardId = demand?.board_id;
  const boardSyncedRef = useRef(false);
  useEffect(() => {
    if (demandBoardId && !boardSyncedRef.current) {
      if (selectedBoardId !== demandBoardId) {
        setSelectedBoardId(demandBoardId);
      }
      boardSyncedRef.current = true;
    }
  }, [demandBoardId]);

  // Track toast state
  const toastShownRef = useRef<{
    loading: boolean;
    success: boolean;
    error: boolean;
  }>({
    loading: false,
    success: false,
    error: false
  });

  // Toast notifications for loading states
  useEffect(() => {
    const toastId = `demand-loading-${id}`;
    if (isLoading && id && !toastShownRef.current.loading) {
      toastShownRef.current = {
        loading: true,
        success: false,
        error: false
      };
      toast.loading("Carregando demanda...", {
        id: toastId
      });
    }
    if (isError && !toastShownRef.current.error) {
      toastShownRef.current.error = true;
      toast.dismiss(toastId);
      toast.error("Erro ao carregar demanda", {
        description: getErrorMessage(error)
      });
    }
    if (demand && !isLoading && !toastShownRef.current.success) {
      toastShownRef.current.success = true;
      toast.dismiss(toastId);
      toast.success("Demanda carregada!", {
        description: demand.title
      });
    }
  }, [isLoading, isError, demand, id, error]);
  const {
    data: role
  } = useTeamRole(demand?.team_id || null);
  const { data: boardRole } = useBoardRole(demand?.board_id || null);
  
  // Fetch creator's role in the board
  const { data: creatorBoardRole } = useQuery({
    queryKey: ["creator-board-role", demand?.board_id, demand?.created_by],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_members")
        .select("role")
        .eq("board_id", demand!.board_id)
        .eq("user_id", demand!.created_by)
        .maybeSingle();
      if (error) throw error;
      return data?.role || null;
    },
    enabled: !!demand?.board_id && !!demand?.created_by,
  });

  const isAssignee = assignees?.some(a => a.user_id === user?.id) || false;
  
  // Map board statuses to a flat format for the dropdown
  const statuses = useMemo(() => {
    if (!boardStatuses) return [];
    return boardStatuses.map(bs => ({
      id: bs.status.id,
      name: bs.status.name,
      color: bs.status.color
    }));
  }, [boardStatuses]);
  
  // Check if demand is delivered or in progress
  const deliveredStatusId = statuses?.find(s => s.name === "Entregue")?.id;
  const approvalStatusId = statuses?.find(s => s.name === "Aprovação do Cliente")?.id;
  const adjustmentStatusId = statuses?.find(s => s.name === "Em Ajuste")?.id;
  const fazendoStatusId = statuses?.find(s => s.name === "Fazendo")?.id;

  // Demandas entregues são apenas visualizáveis
  const isDeliveredStatus = demand?.status_id === deliveredStatusId;
  const isCreator = demand?.created_by === user?.id;
  const isCurrentAssignee = !!assignees?.some((a: any) => a.user_id === user?.id);
  // Pode editar: admin/moderador do quadro, criador da demanda ou responsável atual
  const hasEditPermission = boardRole === "admin" || boardRole === "moderator" || isCreator || isCurrentAssignee;
  const canManageAssignees = !isDeliveredStatus && hasEditPermission;
  const canEdit = !isDeliveredStatus && hasEditPermission;
  const canArchive = !isDeliveredStatus && hasEditPermission;
  const canChangeBoard = !isDeliveredStatus && (boardRole === "admin" || boardRole === "moderator" || boardRole === "executor");

  // Permissões de ajuste baseadas no boardRole
  const canRequestInternalAdjustment = demand?.status_id === approvalStatusId && (boardRole === "admin" || boardRole === "moderator");
  const canRequestExternalAdjustment = demand?.status_id === approvalStatusId && boardRole === "requester";
  const canRequestAdjustment = canRequestInternalAdjustment || canRequestExternalAdjustment;
  const isInProgress = demand?.status_id === fazendoStatusId;
  const isInAdjustment = demand?.status_id === adjustmentStatusId;
  const isDelivered = demand?.status_id === deliveredStatusId || demand?.status_id === approvalStatusId;

  // Timer control permissions (same as Kanban)
  const canControlTimer = !isDeliveredStatus && (boardRole === "admin" || boardRole === "moderator" || boardRole === "executor") && (isInProgress || isInAdjustment);

  // Handle board change
  const handleChangeBoard = async (newBoardId: string) => {
    if (!id || !demand) return;

    try {
      await new Promise<void>((resolve, reject) => {
        updateDemand.mutate(
          { id, board_id: newBoardId },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });

      // Create interaction to log the change
      createInteraction.mutate({
        demand_id: id,
        interaction_type: "status_change",
        content: `Demanda movida para outro quadro`,
      });

      toast.success("Demanda movida para outro quadro com sucesso!");
      setIsChangeBoardDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao mover demanda", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleRequestAdjustment = async () => {
    if (!id || !adjustmentStatusId || !adjustmentReason.trim()) return;

    // Auto-determine adjustment type based on user role
    // Requesters = external, everyone else (admin, moderator, executor) = internal
    const determinedAdjustmentType: "internal" | "external" = boardRole === 'requester' ? 'external' : 'internal';
    const isInternal = determinedAdjustmentType === "internal";
    const typeLabel = isInternal ? "Ajuste Interno" : "Ajuste Externo";
    try {
      // First create the interaction record with metadata
      await new Promise<void>((resolve, reject) => {
        createInteraction.mutate({
          demand_id: id,
          interaction_type: "adjustment_request",
          content: `Solicitou ajuste: ${adjustmentReason.trim()}`,
          metadata: {
            adjustment_type: determinedAdjustmentType
          }
        }, {
          onSuccess: () => resolve(),
          onError: error => reject(error)
        });
      });

      // Then update the demand status
      await new Promise<void>((resolve, reject) => {
        updateDemand.mutate({
          id,
          status_id: adjustmentStatusId,
          status_changed_by: user?.id || null,
          status_changed_at: new Date().toISOString()
        }, {
          onSuccess: () => resolve(),
          onError: error => reject(error)
        });
      });
      toast.success(`${typeLabel} solicitado com sucesso!`);

      // Notify all assignees AND the creator about the adjustment request
      const usersToNotify = new Set<string>();

      // Add all assignees
      assignees?.forEach(a => usersToNotify.add(a.user_id));

      // Always add demand creator (solicitante)
      if (demand?.created_by) {
        usersToNotify.add(demand.created_by);
      }

      // Remove current user from notification list
      if (user?.id) {
        usersToNotify.delete(user.id);
      }
      const notifyUserIds = Array.from(usersToNotify);
      if (notifyUserIds.length > 0) {
        const boardPrefix = currentBoard?.name ? `[${currentBoard.name}] ` : "";
        const notificationTitle = isInternal ? `${boardPrefix}Ajuste interno solicitado` : `${boardPrefix}Ajuste externo solicitado`;
        const notificationMessage = isInternal ? `Foi solicitado um ajuste interno na demanda "${demand?.title}": ${adjustmentReason.trim().substring(0, 100)}${adjustmentReason.length > 100 ? '...' : ''}` : `O cliente solicitou um ajuste na demanda "${demand?.title}": ${adjustmentReason.trim().substring(0, 100)}${adjustmentReason.length > 100 ? '...' : ''}`;
        const notifications = notifyUserIds.map(userId => ({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: "warning",
          link: `/demands/${id}`
        }));
        await supabase.from("notifications").insert(notifications);

        // Send push notifications
        sendAdjustmentPushNotification({
          assigneeIds: notifyUserIds,
          demandId: id,
          demandTitle: demand?.title || "",
          reason: adjustmentReason.trim(),
          isInternal,
          boardName: currentBoard?.name
        }).catch(err => console.error("Error sending push notification:", err));

        // Send email notifications to each user with public link
        const publicUrl = await buildPublicDemandUrl(id, user?.id || "");
        for (const userId of notifyUserIds) {
          try {
            // Get user profile for name
            const {
              data: userProfile
            } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
            await supabase.functions.invoke("send-email", {
              body: {
                to: userId,
                subject: `🔧 ${currentBoard?.name ? `[${currentBoard.name}] ` : ""}${typeLabel} solicitado: ${demand?.title}`,
                template: "notification",
                templateData: {
                  title: notificationTitle,
                  message: `${isInternal ? 'Foi solicitado um ajuste interno' : 'O cliente solicitou um ajuste'} na demanda "${demand?.title}".\n\nMotivo: ${adjustmentReason.trim()}`,
                  actionUrl: publicUrl,
                  actionText: "Ver Demanda",
                  userName: userProfile?.full_name || "Usuário",
                  type: "warning" as const
                }
              }
            });
          } catch (emailError) {
            console.error("Error sending adjustment email:", emailError);
          }
        }
      }
      setAdjustmentReason("");
      setIsAdjustmentDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao solicitar ajuste", {
        description: getErrorMessage(error)
      });
    }
  };
  const handleArchive = () => {
    if (!id) return;
    updateDemand.mutate({
      id,
      archived: true,
      archived_at: new Date().toISOString()
    }, {
      onSuccess: () => {
        toast.success("Demanda arquivada com sucesso!");
        navigate(originInfo.path, {
          state: {
            viewMode: originInfo.viewMode,
            ...(originInfo.calendarMonth && { calendarMonth: originInfo.calendarMonth })
          }
        });
      },
      onError: (error: any) => {
        toast.error("Erro ao arquivar demanda", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  const handleEditAssignees = () => {
    setSelectedAssignees(assignees?.map(a => a.user_id) || []);
    setEditingAssignees(true);
  };
  const handleSaveAssignees = () => {
    if (!id) return;
    if (selectedAssignees.length === 0) {
      toast.error("Selecione pelo menos um responsável", {
        description: "A demanda precisa ter ao menos um responsável definido.",
      });
      return;
    }
    setAssignees.mutate({
      demandId: id,
      userIds: selectedAssignees
    }, {
      onSuccess: () => {
        toast.success("Responsáveis atualizados!");
        setEditingAssignees(false);
      },
      onError: (error: any) => {
        toast.error("Erro ao atualizar responsáveis", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  if (isLoading) {
    return <div className="text-center py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
      </div>;
  }
  if (!demand) {
    return <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Demanda não encontrada</p>
        <Button onClick={() => navigate(originInfo.path, {
        state: {
          viewMode: originInfo.viewMode,
          ...(originInfo.calendarMonth && { calendarMonth: originInfo.calendarMonth })
        }
      })} className="mt-4">
          Voltar para {originInfo.label}
        </Button>
      </div>;
  }
  const formattedAssignees = assignees?.map(a => ({
    user_id: a.user_id,
    profile: a.profile
  })) || [];
  return <>
      <RealtimeUpdateIndicator show={showUpdateIndicator} updateType={lastUpdate?.type} onDismiss={clearUpdateIndicator} />
      <div className="space-y-2 md:space-y-3 animate-fade-in">
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageBreadcrumb items={[{
          label: originInfo.label,
          href: originInfo.path,
          icon: originInfo.icon,
          state: {
            viewMode: originInfo.viewMode,
            ...(originInfo.calendarMonth && { calendarMonth: originInfo.calendarMonth })
          }
        }, {
          label: demand?.title || "Carregando...",
          isCurrent: true
        }]} />
        {id && <DemandPresenceIndicator demandId={id} />}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="space-y-2 min-w-0 w-full overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                {demand.board_sequence_number && <Badge variant="outline" className="text-xs sm:text-sm bg-muted/50 text-muted-foreground border-muted-foreground/20 font-mono shrink-0">
                    {formatDemandCode(demand.board_sequence_number)}
                  </Badge>}
              </div>
              {isEditingTitle ? (
                <form
                  className="flex items-center gap-1.5 w-full overflow-hidden"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingTitle.trim() && editingTitle.trim() !== demand.title) {
                      updateDemand.mutate(
                        { id: demand.id, title: editingTitle.trim() },
                        {
                          onSuccess: () => {
                            toast.success("Título atualizado");
                            setIsEditingTitle(false);
                          },
                          onError: (err) => toast.error(getErrorMessage(err)),
                        }
                      );
                    } else {
                      setIsEditingTitle(false);
                    }
                  }}
                >
                  <Input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full min-w-0 text-base sm:text-lg md:text-2xl font-semibold h-11 px-3 rounded-md border-input bg-background outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-muted-foreground/30 focus:shadow-none focus-visible:shadow-none"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditingTitle(demand.title);
                      }
                    }}
                  />
                  <Button type="submit" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-primary hover:bg-primary/10">
                    <Check className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <div className="group/title flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg md:text-2xl break-words [overflow-wrap:anywhere]">{demand.title}</CardTitle>
                  {(() => {
                    const currentStatusName = boardStatuses?.find(s => s.status_id === demand.status_id)?.status?.name?.toLowerCase();
                    const isDelivered = currentStatusName === "entregue";
                    if (isDelivered) return null;
                    return (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 md:opacity-0 md:group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingTitle(demand.title);
                          setIsEditingTitle(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    );
                  })()}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {demand.priority && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "uppercase text-[10px] font-bold tracking-wider border",
                      demand.priority === "urgente" && "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
                      demand.priority === "alta" && "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
                      demand.priority === "media" && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
                      demand.priority === "baixa" && "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
                    )}
                  >
                    {demand.priority}
                  </Badge>
                )}
                {demand.teams && <Badge variant="secondary">{demand.teams.name}</Badge>}
                
                {/* Board Badge - clickable if can change */}
                {currentBoard && (
                  canChangeBoard ? (
                    <Badge 
                      variant="outline" 
                      className="gap-1 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setIsChangeBoardDialogOpen(true)}
                    >
                      <Kanban className="h-3 w-3" />
                      {currentBoard.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Kanban className="h-3 w-3" />
                      {currentBoard.name}
                    </Badge>
                  )
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Share Button */}
              <ShareDemandButton demandId={demand.id} />
              
              {canRequestAdjustment && <Button variant="outline" size="sm" onClick={() => setIsAdjustmentDialogOpen(true)} className={cn("flex-1 sm:flex-none", boardRole === 'requester' ? "border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950" : "border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950")}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Solicitar Ajuste
                </Button>}
              {canRequestAdjustment && <Dialog open={isAdjustmentDialogOpen} onOpenChange={open => {
                setIsAdjustmentDialogOpen(open);
                if (!open) {
                  setAdjustmentReason("");
                }
              }}>
                  <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Solicitar Ajuste
                      </DialogTitle>
                      <DialogDescription>
                        {boardRole === 'requester' ? "Descreva o que precisa ser ajustado nesta demanda. A equipe receberá sua solicitação." : "Descreva o ajuste necessário nesta demanda."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Motivo do ajuste <span className="text-destructive">*</span>
                        </label>
                        <RichTextEditor 
                          value={adjustmentReason} 
                          onChange={setAdjustmentReason} 
                          minHeight="120px"
                          placeholder="Descreva o que precisa ser corrigido ou alterado..."
                        />
                      </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                      setIsAdjustmentDialogOpen(false);
                      setAdjustmentReason("");
                    }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleRequestAdjustment} disabled={!adjustmentReason.trim() || updateDemand.isPending} className={boardRole === 'requester' ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}>
                        {updateDemand.isPending ? "Enviando..." : "Solicitar Ajuste"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>}
              {/* Status Dropdown - available for all users */}
              {demand.demand_statuses && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2" style={{
                    backgroundColor: `${demand.demand_statuses.color}20`,
                    borderColor: `${demand.demand_statuses.color}40`,
                    color: demand.demand_statuses.color
                  }}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                      backgroundColor: demand.demand_statuses.color
                    }} />
                      {demand.demand_statuses.name}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-popover">
                    {statuses?.map(status => <DropdownMenuItem key={status.id} onClick={async () => {
                    if (status.id !== demand.status_id) {
                      const previousStatusName = demand.demand_statuses?.name;

                      // Check dependency before allowing status change
                      if (status.name !== "A Iniciar" && previousStatusName === "A Iniciar") {
                        const depCheck = await checkDependencyBeforeStatusChange(demand.id);
                        if (depCheck.blocked) {
                          toast.error("Não é possível alterar o status", {
                            description: `Esta demanda depende de "${depCheck.blockedByTitle}" que ainda não foi concluída.`,
                          });
                          return;
                        }
                      }

                      const timerStatuses = ["Fazendo", "Em Ajuste"];
                      const isEnteringTimerStatus = timerStatuses.includes(status.name);
                      const isLeavingTimerStatus = previousStatusName && timerStatuses.includes(previousStatusName) && !isEnteringTimerStatus;

                      if (isLeavingTimerStatus && isTimerRunning) {
                        stopTimer();
                      }

                      updateDemand.mutate({
                        id: demand.id,
                        status_id: status.id,
                        status_changed_by: user?.id || null,
                        status_changed_at: new Date().toISOString()
                      }, {
                        onSuccess: () => {
                          toast.success(`Status alterado para "${status.name}"!`);
                          if (isEnteringTimerStatus && !isTimerRunning) {
                            startTimer();
                          }
                        }
                      });
                    }
                  }} disabled={status.id === demand.status_id} className={status.id === demand.status_id ? "bg-muted font-medium" : ""}>
                        <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{
                      backgroundColor: status.color
                    }} />
                        {status.name}
                        {status.id === demand.status_id && <span className="ml-auto text-xs text-muted-foreground">(atual)</span>}
                      </DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>}
              {canEdit && <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)} className="flex-1 sm:flex-none">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>}
              {canArchive && <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={updateDemand.isPending} className="flex-1 sm:flex-none">
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja arquivar esta demanda? Você poderá restaurá-la posteriormente na seção de demandas arquivadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive} className="w-full sm:w-auto">
                      Arquivar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>}
              {/* Folder picker button */}
              <DemandFolderPicker
                demandId={demand.id}
                teamId={demand.team_id}
                subdemandIds={!demand.parent_demand_id ? (subdemands || []).map(s => s.id) : undefined}
                canEdit={canEdit}
                variant="button"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 pt-0 md:pt-0">
          {/* Time tracking display - prominent position (hidden for board requesters) */}
          {boardRole !== "requester" && (
            !demand.parent_demand_id && subdemands && subdemands.length > 0 ? (
              <ParentDemandTimeDisplay demandId={demand.id} subdemandIds={subdemands.map(s => s.id)} />
            ) : (
              (isInProgress || isInAdjustment || isDelivered) && (
                <UserTimeTrackingDisplay demandId={demand.id} variant="detail" showControls={canControlTimer} canControl={canControlTimer} canEdit={boardRole === "admin" || boardRole === "moderator" || boardRole === "executor"} />
              )
            )
          )}

          {demand.description && <div className="w-full overflow-hidden">
              <h3 className="font-semibold mb-2 text-sm md:text-base">Descrição</h3>
              <div className="w-full overflow-x-auto">
                <RichTextDisplay 
                  content={demand.description} 
                  className="text-xs sm:text-sm md:text-base text-muted-foreground" 
                />
              </div>
            </div>}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Creator info with board role */}
            {demand.profiles && (
              <div className="flex items-center gap-2 text-sm">
                <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Criado por:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5 border border-border">
                    <AvatarImage src={demand.profiles.avatar_url || undefined} alt={demand.profiles.full_name} />
                    <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                      {demand.profiles.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{demand.profiles.full_name}</span>
                  {creatorBoardRole && (
                    <Badge variant="outline" className={cn(
                      "text-[10px] px-1.5 py-0 h-4",
                      creatorBoardRole === "admin" && "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
                      creatorBoardRole === "moderator" && "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
                      creatorBoardRole === "executor" && "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
                      creatorBoardRole === "requester" && "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
                    )}>
                      {creatorBoardRole === "admin" ? "Administrador" : creatorBoardRole === "moderator" ? "Coordenador" : creatorBoardRole === "executor" ? "Agente" : "Solicitante"}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {demand.due_date && <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">
                  {formatDateOnlyBR(demand.due_date)}
                </span>
              </div>}

            {/* Service tag */}
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Serviço:</span>
              <Badge variant="outline" className={cn("text-xs", demand.services?.name ? "bg-primary/5 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground border-muted-foreground/20")}>
                {demand.services?.name || "Nenhum serviço selecionado"}
              </Badge>
            </div>



            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Responsáveis:</span>
              </div>
              {editingAssignees ? <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="flex-1">
                    <AssigneeSelector teamId={demand.team_id} boardId={demand.board_id} selectedUserIds={selectedAssignees} onChange={setSelectedAssignees} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAssignees} disabled={setAssignees.isPending} className="flex-1 sm:flex-none">
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAssignees(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                  </div>
                </div> : <div className="flex items-center gap-2">
                  {formattedAssignees.length > 0 ? <AssigneeAvatars assignees={formattedAssignees} size="md" /> : <span className="text-muted-foreground">Nenhum</span>}
                  {canManageAssignees && <Button size="sm" variant="ghost" onClick={handleEditAssignees}>
                      Editar
                    </Button>}
                </div>}
            </div>
          </div>

            {/* Status changed by */}
            {(demand as any).status_changed_by_profile && (
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Último status por:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5 border border-border">
                    <AvatarImage src={(demand as any).status_changed_by_profile.avatar_url || undefined} alt={(demand as any).status_changed_by_profile.full_name} />
                    <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                      {(demand as any).status_changed_by_profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{(demand as any).status_changed_by_profile.full_name}</span>
                </div>
              </div>
            )}


          {/* Dependency info banner */}
          {demandDeps && demandDeps.length > 0 && (() => {
            const blocked = demandDeps.find(d => d.isBlocked);
            return (
              <div className={cn(
                "flex items-center gap-2 text-sm rounded-lg px-3 py-2",
                blocked ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              )}>
                {blocked ? <Lock className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {blocked ? (
                  <span>Bloqueada - Aguardando demanda <strong>'{blocked.dependsOnTitle}'</strong> ser concluída</span>
                ) : (
                  <span>Dependência concluída — <strong>"{demandDeps[0].dependsOnTitle}"</strong> entregue</span>
                )}
              </div>
            );
          })()}

          {/* Parent demand link */}
          {demand.parent_demand_id && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Subdemanda de:</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary font-medium"
                onClick={() => navigate(`/demands/${demand.parent_demand_id}`)}
              >
                {parentDemand?.board_sequence_number ? `#${String(parentDemand.board_sequence_number).padStart(4, "0")} ` : ""}
                {parentDemand?.title || "Demanda pai"}
              </Button>
            </div>
          )}

          {/* Subdemands section */}
          {!demand.parent_demand_id && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm md:text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Subdemandas
                  {subdemands && subdemands.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{subdemands.length}</Badge>
                  )}
                </h3>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowSubdemandDialog(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </Button>
                )}
              </div>

              <CreateSubdemandDialog
                open={showSubdemandDialog}
                onClose={() => setShowSubdemandDialog(false)}
                onSave={async (data: SubdemandFormData) => {
                  if (!demand) return;
                  const defaultStatus = statuses?.find(s => s.name === "A Iniciar") || statuses?.[0];
                  if (!defaultStatus) return;
                  try {
                    const result = await addSubdemand.mutateAsync({
                      parentDemandId: demand.id,
                      title: data.title,
                      teamId: demand.team_id,
                      boardId: demand.board_id,
                      statusId: data.status_id || defaultStatus.id,
                      priority: data.priority,
                      description: data.description,
                      dueDate: data.due_date,
                      serviceId: data.service_id,
                    });

                    if (!result?.id) {
                      toast.success("Subdemanda criada!");
                      return;
                    }

                    // Insert assignees
                    if (data.assigneeIds && data.assigneeIds.length > 0) {
                      const inserts = data.assigneeIds.map(userId => ({
                        demand_id: result.id,
                        user_id: userId,
                      }));
                      await supabase.from("demand_assignees").insert(inserts);
                    }

                    // Insert dependency
                    if (data.dependsOnIndex !== undefined && subdemands && subdemands[data.dependsOnIndex]) {
                      await supabase.from("demand_dependencies").insert({
                        demand_id: result.id,
                        depends_on_demand_id: subdemands[data.dependsOnIndex].id,
                      });
                    }

                    // Upload pending files as attachments
                    if (data.pendingFiles && data.pendingFiles.length > 0) {
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (currentUser) {
                        for (const pf of data.pendingFiles) {
                          const ext = pf.file.name.split(".").pop();
                          const filePath = `demand-${result.id}/${crypto.randomUUID()}.${ext}`;
                          const { error: uploadError } = await supabase.storage
                            .from("demand-attachments")
                            .upload(filePath, pf.file);
                          if (uploadError) {
                            console.error("Upload error:", uploadError);
                            continue;
                          }
                          await supabase.from("demand_attachments").insert({
                            demand_id: result.id,
                            file_name: pf.file.name,
                            file_path: filePath,
                            file_type: pf.file.type,
                            file_size: pf.file.size,
                            uploaded_by: currentUser.id,
                          });
                        }
                      }
                    }

                    // Invalidate all related queries after all operations
                    queryClient.invalidateQueries({ queryKey: ["subdemands", demand.id] });
                    queryClient.invalidateQueries({ queryKey: ["demand-dependencies"] });
                    queryClient.invalidateQueries({ queryKey: ["demands"] });
                    queryClient.invalidateQueries({ queryKey: ["attachments"] });

                    toast.success("Subdemanda criada!");
                  } catch (err) {
                    toast.error(getErrorMessage(err));
                  }
                }}
                existingSubdemands={(subdemands || []).map((s, i) => ({
                  tempId: s.id,
                  title: s.title,
                  priority: s.priority || undefined,
                  status_id: s.status_id,
                }))}
                statuses={statuses}
                defaultStatusId={statuses?.find(s => s.name === "A Iniciar")?.id || statuses?.[0]?.id || ""}
                teamId={demand?.team_id || null}
                boardId={demand?.board_id || null}
                parentServiceId={demand?.service_id || undefined}
                parentServiceName={(demand as any)?.services?.name || undefined}
                parentAssigneeIds={assignees?.map(a => a.user_id) || []}
              />

              {subdemands && subdemands.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subdemands.map((sub) => {
                    const statusName = sub.demand_statuses?.name || "";
                    const statusColor = sub.demand_statuses?.color || "#9CA3AF";
                    const isDelivered = statusName === "Entregue";
                    const isNotStarted = statusName === "A Iniciar";
                    const bgColor = statusColor !== "#9CA3AF" ? statusColor
                      : isDelivered ? "#10B981"
                      : isNotStarted ? "#9CA3AF"
                      : "#F28705";
                    const assignees = sub.demand_assignees || [];
                    const totalSeconds = sub.time_in_progress_seconds || 0;
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const timeLabel = totalSeconds > 0
                      ? `${hours}h${minutes > 0 ? `${String(minutes).padStart(2, "0")}m` : ""}`
                      : null;
                    const priorityLabel = sub.priority === "alta" ? "Alta" : sub.priority === "baixa" ? "Baixa" : "Média";
                    const priorityColor = sub.priority === "alta" ? "#EF4444" : sub.priority === "baixa" ? "#3B82F6" : "#F59E0B";
                    const subDeps = subDepsMap?.[sub.id] || [];
                    const subIsBlocked = subDeps.some(d => d.isBlocked);

                    return (
                      <button
                        key={sub.id}
                        onClick={() => navigate(`/demands/${sub.id}`)}
                        draggable={hasEditPermission}
                        onDragStart={(e) => {
                          if (!hasEditPermission) return;
                          setDraggedSubId(sub.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("application/x-subdemand-id", sub.id);
                        }}
                        onDragEnd={() => {
                          setDraggedSubId(null);
                          setDragOverSubId(null);
                        }}
                        onDragOver={(e) => {
                          if (!hasEditPermission) return;
                          if (!e.dataTransfer.types.includes("application/x-subdemand-id")) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverSubId !== sub.id) setDragOverSubId(sub.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverSubId === sub.id) setDragOverSubId(null);
                        }}
                        onDrop={(e) => {
                          if (!hasEditPermission) return;
                          e.preventDefault();
                          handleReorderSubdemand(sub.id);
                        }}
                        className={cn(
                          "w-full h-full text-left rounded-lg overflow-hidden transition-all hover:opacity-90 cursor-pointer border flex flex-col",
                          dragOverSubId === sub.id && "ring-2 ring-primary ring-offset-1",
                          draggedSubId === sub.id && "opacity-50"
                        )}
                        style={{ borderColor: `${bgColor}33` }}
                        title={`${sub.title} — ${statusName}${hasEditPermission ? " (arraste para reordenar)" : ""}`}
                      >
                        {/* Color header bar */}
                        <div className="px-3 py-1.5 text-white text-xs font-semibold truncate flex items-center gap-1.5" style={{ backgroundColor: bgColor }}>
                          {hasEditPermission && (
                            <GripVertical className="h-3 w-3 opacity-60 shrink-0 cursor-grab active:cursor-grabbing" />
                          )}
                          <span className="truncate">
                            {sub.board_sequence_number ? `#${String(sub.board_sequence_number).padStart(4, "0")} · ` : ""}
                            {sub.title}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="px-3 py-2 bg-card space-y-1.5 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: bgColor }}>
                              {statusName}
                            </span>
                            <span className="text-[10px] font-medium uppercase" style={{ color: priorityColor }}>
                              {priorityLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            {/* Assignees */}
                            <div className="flex items-center gap-1 min-w-0">
                              {assignees.length > 0 ? (
                                <div className="flex -space-x-1.5">
                                  {assignees.slice(0, 3).map((a) => (
                                    <Avatar key={a.user_id} className="h-4 w-4 border border-background">
                                      <AvatarImage src={a.profile?.avatar_url || undefined} />
                                      <AvatarFallback className="text-[6px]">
                                        {a.profile?.full_name?.charAt(0) || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {assignees.length > 3 && (
                                    <span className="text-[9px] ml-1">+{assignees.length - 3}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="truncate">Sem responsável</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <SubdemandTimer demandId={sub.id} />
                              {!sub.time_in_progress_seconds && (
                                <span className="font-mono text-[10px] text-muted-foreground">0h</span>
                              )}
                              {sub.due_date && (
                                <span>{formatDateOnlyBR(sub.due_date)}</span>
                              )}
                            </div>
                          </div>
                          {/* Dependency indicator */}
                          {subDeps.length > 0 && (
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 text-[10px] font-medium",
                              subIsBlocked
                                ? "text-red-600 bg-red-500/5"
                                : "text-emerald-600 bg-emerald-500/5"
                            )}>
                              {subIsBlocked ? <Lock className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                              <span className="truncate">
                                {subIsBlocked
                                  ? `Depende de: ${subDeps.find(d => d.isBlocked)?.dependsOnTitle}`
                                  : `Dependência OK: ${subDeps[0]?.dependsOnTitle}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma subdemanda</p>
              )}
            </div>
          )}

          {/* Attachments section - result/deliverables - only agents/admins can upload */}
          <div>
            
            <AttachmentUploader demandId={demand.id} readOnly={!(boardRole === "admin" || boardRole === "moderator" || boardRole === "executor")} demandTitle={demand.title} demandCreatedBy={demand.created_by} showSubdemandAttachments={!!(subdemands && subdemands.length > 0)} />
          </div>
        </CardContent>
      </Card>

      <DemandChat
        demandId={demand.id}
        boardId={demand.board_id}
        boardRole={boardRole || null}
        teamId={demand.team_id}
        demandTitle={demand.title}
        demandCreatedBy={demand.created_by}
        assignees={assignees?.map(a => ({ user_id: a.user_id })) || []}
        boardName={currentBoard?.name}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Demanda</DialogTitle>
            <DialogDescription>
              Atualize as informações da demanda
            </DialogDescription>
          </DialogHeader>
          <DemandEditForm demand={{
            id: demand.id,
            title: demand.title,
            description: demand.description,
            status_id: demand.status_id,
            priority: demand.priority,
            due_date: demand.due_date,
            service_id: demand.service_id,
            team_id: demand.team_id,
            board_id: demand.board_id
          }} onClose={() => setIsEditDialogOpen(false)} onSuccess={() => setIsEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Change Board Dialog */}
      {demand && currentBoard && (
        <ChangeBoardDialog
          open={isChangeBoardDialogOpen}
          onOpenChange={setIsChangeBoardDialogOpen}
          currentBoardId={demand.board_id}
          currentBoardName={currentBoard.name}
          teamId={demand.team_id}
          onConfirm={handleChangeBoard}
          isPending={updateDemand.isPending}
        />
      )}
    </div>
    </>;
}