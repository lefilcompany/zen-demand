import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDemandById, useDemandInteractions, useCreateInteraction, useUpdateInteraction, useDeleteInteraction, useUpdateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useUploadAttachment } from "@/hooks/useAttachments";
import { InlineFileUploader, PendingFile, uploadPendingFiles } from "@/components/InlineFileUploader";
import { InteractionAttachments } from "@/components/InteractionAttachments";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useAuth } from "@/lib/auth";
import { useUserTimerControl } from "@/hooks/useUserTimeTracking";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { DemandEditForm } from "@/components/DemandEditForm";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Calendar, Users, MessageSquare, Archive, Pencil, Wrench, Filter, MoreHorizontal, Trash2, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Link } from "react-router-dom";
import { UserTimeTrackingDisplay } from "@/components/UserTimeTrackingDisplay";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendAdjustmentPushNotification, sendCommentPushNotification } from "@/hooks/useSendPushNotification";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useRealtimeDemandDetail } from "@/hooks/useRealtimeDemandDetail";
import { DemandPresenceIndicator } from "@/components/DemandPresenceIndicator";
import { RealtimeUpdateIndicator } from "@/components/RealtimeUpdateIndicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/TypingIndicator";

export default function DemandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user came from kanban
  const cameFromKanban = location.state?.from === "kanban" || document.referrer.includes("/kanban");
  const backPath = cameFromKanban ? "/kanban" : "/demands";
  const { user } = useAuth();
  const { data: demand, isLoading, isError, error } = useDemandById(id);
  const { data: interactions } = useDemandInteractions(id!);
  const { data: assignees } = useDemandAssignees(id || null);
  const { data: statuses } = useDemandStatuses();
  
  // Enable realtime updates for this demand
  const { lastUpdate, showUpdateIndicator, clearUpdateIndicator } = useRealtimeDemandDetail(id);
  
  // Enable typing indicator
  const { typingUsers, handleInputChange, stopTyping } = useTypingIndicator(id);
  
  const createInteraction = useCreateInteraction();
  const updateInteraction = useUpdateInteraction();
  const deleteInteraction = useDeleteInteraction();
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const uploadAttachment = useUploadAttachment();
  const { isTimerRunning, startTimer, stopTimer, isLoading: isTimerLoading } = useUserTimerControl(id);
  const sendEmail = useSendEmail();
  const [comment, setComment] = useState("");
  const [commentPendingFiles, setCommentPendingFiles] = useState<PendingFile[]>([]);
  const [adjustmentPendingFiles, setAdjustmentPendingFiles] = useState<PendingFile[]>([]);
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"internal" | "external">("internal");
  const [interactionFilter, setInteractionFilter] = useState<string>("all");
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editingInteractionContent, setEditingInteractionContent] = useState("");
  
  // Track toast state
  const toastShownRef = useRef<{ loading: boolean; success: boolean; error: boolean }>({
    loading: false,
    success: false,
    error: false,
  });

  // Toast notifications for loading states
  useEffect(() => {
    const toastId = `demand-loading-${id}`;
    
    if (isLoading && id && !toastShownRef.current.loading) {
      toastShownRef.current = { loading: true, success: false, error: false };
      toast.loading("Carregando demanda...", { id: toastId });
    }
    
    if (isError && !toastShownRef.current.error) {
      toastShownRef.current.error = true;
      toast.dismiss(toastId);
      toast.error("Erro ao carregar demanda", {
        description: getErrorMessage(error),
      });
    }
    
    if (demand && !isLoading && !toastShownRef.current.success) {
      toastShownRef.current.success = true;
      toast.dismiss(toastId);
      toast.success("Demanda carregada!", {
        description: demand.title,
      });
    }
  }, [isLoading, isError, demand, id, error]);

  const { data: role } = useTeamRole(demand?.team_id || null);
  const isAssignee = assignees?.some(a => a.user_id === user?.id) || false;
  // Check if demand is delivered or in progress
  const deliveredStatusId = statuses?.find((s) => s.name === "Entregue")?.id;
  const approvalStatusId = statuses?.find((s) => s.name === "Aprovação do Cliente")?.id;
  const adjustmentStatusId = statuses?.find((s) => s.name === "Em Ajuste")?.id;
  const fazendoStatusId = statuses?.find((s) => s.name === "Fazendo")?.id;
  
  // Demandas entregues são apenas visualizáveis
  const isDeliveredStatus = demand?.status_id === deliveredStatusId;
  const canManageAssignees = !isDeliveredStatus && (role === "admin" || role === "moderator");
  const canEdit = !isDeliveredStatus && (role === "admin" || role === "moderator" || role === "executor" || demand?.created_by === user?.id);
  const canArchive = isDeliveredStatus; // Apenas demandas entregues podem ser arquivadas
  const isCreator = demand?.created_by === user?.id;

  // Permissões de ajuste baseadas no role
  const canRequestInternalAdjustment = demand?.status_id === approvalStatusId && (role === "admin" || role === "moderator");
  const canRequestExternalAdjustment = demand?.status_id === approvalStatusId && role === "requester";
  const canRequestAdjustment = canRequestInternalAdjustment || canRequestExternalAdjustment;
  const isInProgress = demand?.status_id === fazendoStatusId;
  const isInAdjustment = demand?.status_id === adjustmentStatusId;
  const isDelivered = demand?.status_id === deliveredStatusId || demand?.status_id === approvalStatusId;
  
  // Timer control permissions (same as Kanban)
  const canControlTimer = !isDeliveredStatus && 
    (role === "admin" || role === "moderator" || role === "executor") &&
    (isInProgress || isInAdjustment);

  const filteredInteractions = useMemo(() => {
    if (!interactions) return [];
    if (interactionFilter === "all") return interactions;
    return interactions.filter((i) => i.interaction_type === interactionFilter);
  }, [interactions, interactionFilter]);

  // Get the latest adjustment request for highlighting
  const latestAdjustmentRequest = useMemo(() => {
    if (!interactions) return null;
    const adjustmentRequests = interactions.filter(i => i.interaction_type === "adjustment_request");
    return adjustmentRequests.length > 0 ? adjustmentRequests[0] : null; // Already sorted by created_at desc
  }, [interactions]);


  const handleRequestAdjustment = async () => {
    if (!id || !adjustmentStatusId || !adjustmentReason.trim()) return;
    
    const isInternal = adjustmentType === "internal";
    const typeLabel = isInternal ? "Ajuste Interno" : "Ajuste Externo";
    
    try {
      // First create the interaction record with metadata
      await new Promise<void>((resolve, reject) => {
        createInteraction.mutate(
          {
            demand_id: id,
            interaction_type: "adjustment_request",
            content: `Solicitou ajuste: ${adjustmentReason.trim()}`,
            metadata: { adjustment_type: adjustmentType },
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
      
      // Then update the demand status
      await new Promise<void>((resolve, reject) => {
        updateDemand.mutate(
          { id, status_id: adjustmentStatusId },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
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
        const notificationTitle = isInternal ? "Ajuste interno solicitado" : "Ajuste externo solicitado";
        const notificationMessage = isInternal 
          ? `Foi solicitado um ajuste interno na demanda "${demand?.title}": ${adjustmentReason.trim().substring(0, 100)}${adjustmentReason.length > 100 ? '...' : ''}`
          : `O cliente solicitou um ajuste na demanda "${demand?.title}": ${adjustmentReason.trim().substring(0, 100)}${adjustmentReason.length > 100 ? '...' : ''}`;
        
        const notifications = notifyUserIds.map((userId) => ({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: "warning",
          link: `/demands/${id}`,
        }));
        
        await supabase.from("notifications").insert(notifications);
        
        // Send push notifications
        sendAdjustmentPushNotification({
          assigneeIds: notifyUserIds,
          demandId: id,
          demandTitle: demand?.title || "",
          reason: adjustmentReason.trim(),
          isInternal,
        }).catch(err => console.error("Error sending push notification:", err));
        
        // Send email notifications to each user
        for (const userId of notifyUserIds) {
          try {
            // Get user profile for name
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", userId)
              .single();
            
            await supabase.functions.invoke("send-email", {
              body: {
                to: userId,
                subject: `🔧 ${typeLabel} solicitado: ${demand?.title}`,
                template: "notification",
                templateData: {
                  title: notificationTitle,
                  message: `${isInternal ? 'Foi solicitado um ajuste interno' : 'O cliente solicitou um ajuste'} na demanda "${demand?.title}".\n\nMotivo: ${adjustmentReason.trim()}`,
                  actionUrl: `${window.location.origin}/demands/${id}`,
                  actionText: "Ver Demanda",
                  userName: userProfile?.full_name || "Usuário",
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
      setAdjustmentType("internal");
      setIsAdjustmentDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao solicitar ajuste", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleArchive = () => {
    if (!id) return;
    updateDemand.mutate(
      {
        id,
        archived: true,
        archived_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Demanda arquivada com sucesso!");
          navigate("/demands");
        },
        onError: (error: any) => {
          toast.error("Erro ao arquivar demanda", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !id) return;

    const commentContent = comment.trim();
    
    createInteraction.mutate(
      {
        demand_id: id,
        interaction_type: "comment",
        content: commentContent,
      },
      {
        onSuccess: async (createdInteraction) => {
          // Upload pending files linked to the interaction
          if (commentPendingFiles.length > 0 && createdInteraction?.id) {
            const { success, failed } = await uploadPendingFiles(
              id, 
              commentPendingFiles, 
              uploadAttachment,
              createdInteraction.id
            );
            if (failed > 0) {
              toast.warning(`Comentário adicionado! ${success} arquivo(s) enviado(s), ${failed} falhou(ram)`);
            } else {
              toast.success(`Comentário adicionado com ${success} anexo(s)!`);
            }
            setCommentPendingFiles([]);
          } else {
            toast.success("Comentário adicionado!");
          }
          setComment("");
          
          // Stop typing indicator
          stopTyping();
          
          // Notify assignees and creator about the new comment (excluding current user)
          const usersToNotify = new Set<string>();
          
          // Add all assignees
          assignees?.forEach(a => usersToNotify.add(a.user_id));
          
          // Add demand creator
          if (demand?.created_by) {
            usersToNotify.add(demand.created_by);
          }
          
          // Remove current user from notification list
          if (user?.id) {
            usersToNotify.delete(user.id);
          }
          
          const notifyUserIds = Array.from(usersToNotify);
          
          if (notifyUserIds.length > 0) {
            // Get current user's name
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user?.id || "")
              .single();
            
            const commenterName = currentProfile?.full_name || "Alguém";
            
            // Create in-app notifications
            const notifications = notifyUserIds.map((userId) => ({
              user_id: userId,
              title: "Novo comentário",
              message: `${commenterName} comentou na demanda "${demand?.title}": ${commentContent.substring(0, 100)}${commentContent.length > 100 ? "..." : ""}`,
              type: "info",
              link: `/demands/${id}`,
            }));
            
            await supabase.from("notifications").insert(notifications);
            
            // Send push notifications
            sendCommentPushNotification({
              userIds: notifyUserIds,
              demandId: id,
              demandTitle: demand?.title || "",
              commenterName,
              commentPreview: commentContent,
            }).catch(err => console.error("Error sending comment push notification:", err));
            
            // Send email notifications to each user
            for (const userId of notifyUserIds) {
              sendEmail.mutate({
                to: userId, // Edge function will look up email by user_id
                subject: `💬 Novo comentário em "${demand?.title}"`,
                template: 'notification',
                templateData: {
                  title: "Novo comentário na demanda",
                  message: `${commenterName} comentou na demanda "${demand?.title}":\n\n"${commentContent.substring(0, 200)}${commentContent.length > 200 ? "..." : ""}"`,
                  actionUrl: `${window.location.origin}/demands/${id}`,
                  actionText: "Ver demanda",
                  type: 'info',
                },
              });
            }
          }
        },
        onError: (error: any) => {
          toast.error("Erro ao adicionar comentário", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleEditInteraction = (interactionId: string, content: string) => {
    setEditingInteractionId(interactionId);
    setEditingInteractionContent(content);
  };

  const handleSaveInteraction = () => {
    if (!id || !editingInteractionId || !editingInteractionContent.trim()) return;
    
    updateInteraction.mutate(
      { id: editingInteractionId, demandId: id, content: editingInteractionContent.trim() },
      {
        onSuccess: () => {
          toast.success("Comentário atualizado!");
          setEditingInteractionId(null);
          setEditingInteractionContent("");
        },
        onError: (error: any) => {
          toast.error("Erro ao atualizar comentário", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleDeleteInteraction = (interactionId: string) => {
    if (!id) return;
    
    deleteInteraction.mutate(
      { id: interactionId, demandId: id },
      {
        onSuccess: () => {
          toast.success("Comentário excluído!");
        },
        onError: (error: any) => {
          toast.error("Erro ao excluir comentário", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleEditAssignees = () => {
    setSelectedAssignees(assignees?.map(a => a.user_id) || []);
    setEditingAssignees(true);
  };

  const handleSaveAssignees = () => {
    if (!id) return;
    setAssignees.mutate(
      { demandId: id, userIds: selectedAssignees },
      {
        onSuccess: () => {
          toast.success("Responsáveis atualizados!");
          setEditingAssignees(false);
        },
        onError: (error: any) => {
          toast.error("Erro ao atualizar responsáveis", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Demanda não encontrada</p>
        <Button onClick={() => navigate("/demands")} className="mt-4">
          Voltar para Demandas
        </Button>
      </div>
    );
  }

  const formattedAssignees = assignees?.map(a => ({
    user_id: a.user_id,
    profile: a.profile,
  })) || [];

  return (
    <>
      <RealtimeUpdateIndicator 
        show={showUpdateIndicator} 
        updateType={lastUpdate?.type}
        onDismiss={clearUpdateIndicator}
      />
      <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageBreadcrumb
          items={[
            {
              label: cameFromKanban ? "Kanban" : "Demandas",
              href: backPath,
              icon: cameFromKanban ? LayoutGrid : List,
            },
            {
              label: demand?.title || "Carregando...",
              isCurrent: true,
            },
          ]}
        />
        {id && <DemandPresenceIndicator demandId={id} />}
      </div>

      {/* Adjustment Alert - Shows when demand is in "Em Ajuste" status */}
      {isInAdjustment && latestAdjustmentRequest && (() => {
        const latestMetadata = latestAdjustmentRequest.metadata as { adjustment_type?: string } | null;
        const latestType = latestMetadata?.adjustment_type || "external";
        const isInternalAlert = latestType === "internal";
        
        return (
          <Alert className={isInternalAlert ? "border-blue-500/50 bg-blue-500/10" : "border-purple-500/50 bg-purple-500/10"}>
            <Wrench className={`h-4 w-4 ${isInternalAlert ? "text-blue-600" : "text-purple-600"}`} />
            <AlertTitle className={`${isInternalAlert ? "text-blue-600" : "text-purple-600"} font-semibold`}>
              {isInternalAlert ? "Ajuste Interno Solicitado" : "Ajuste Externo Solicitado"}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {latestAdjustmentRequest.content}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">
                  {latestAdjustmentRequest.profiles?.full_name}
                </span>
                <span>•</span>
                <span>
                  {format(
                    new Date(latestAdjustmentRequest.created_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        );
      })()}

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-2 min-w-0">
              <CardTitle className="text-lg md:text-2xl break-words">{demand.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {demand.demand_statuses && (
                  <Badge
                    style={{
                      backgroundColor: `${demand.demand_statuses.color}20`,
                      color: demand.demand_statuses.color,
                      borderColor: `${demand.demand_statuses.color}40`,
                    }}
                  >
                    {demand.demand_statuses.name}
                  </Badge>
                )}
                {demand.priority && (
                  <Badge variant="outline">{demand.priority}</Badge>
                )}
                {demand.teams && (
                  <Badge variant="secondary">{demand.teams.name}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canRequestInternalAdjustment && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdjustmentType("internal");
                      setIsAdjustmentDialogOpen(true);
                    }}
                    className="flex-1 sm:flex-none border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    <span className="hidden xs:inline">Ajuste</span> Interno
                  </Button>
                </>
              )}
              {canRequestExternalAdjustment && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdjustmentType("external");
                      setIsAdjustmentDialogOpen(true);
                    }}
                    className="flex-1 sm:flex-none border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    <span className="hidden xs:inline">Ajuste</span> Externo
                  </Button>
                </>
              )}
              {canRequestAdjustment && (
                <Dialog open={isAdjustmentDialogOpen} onOpenChange={(open) => {
                  setIsAdjustmentDialogOpen(open);
                  if (!open) {
                    setAdjustmentReason("");
                    setAdjustmentType("internal");
                  }
                }}>
                  <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {adjustmentType === "internal" ? "Solicitar Ajuste Interno" : "Solicitar Ajuste Externo"}
                      </DialogTitle>
                      <DialogDescription>
                        {adjustmentType === "internal" 
                          ? "Descreva o ajuste interno necessário nesta demanda."
                          : "Descreva o que precisa ser ajustado nesta demanda. A equipe receberá sua solicitação."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="adjustment-reason" className="text-sm font-medium">
                          Motivo do ajuste <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          id="adjustment-reason"
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
                          setIsAdjustmentDialogOpen(false);
                          setAdjustmentReason("");
                          setAdjustmentType("internal");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleRequestAdjustment}
                        disabled={!adjustmentReason.trim() || updateDemand.isPending}
                        className={adjustmentType === "internal" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"}
                      >
                        {updateDemand.isPending ? "Enviando..." : adjustmentType === "internal" ? "Solicitar Ajuste Interno" : "Solicitar Ajuste Externo"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
              {canArchive && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateDemand.isPending}
                      className="flex-1 sm:flex-none"
                    >
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
              </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
          {demand.description && (
            <div>
              <h3 className="font-semibold mb-2 text-sm md:text-base">Descrição</h3>
              <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                {demand.description}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {demand.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">
                  {format(new Date(demand.due_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Responsáveis:</span>
              </div>
              {editingAssignees ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="flex-1">
                    <AssigneeSelector
                      teamId={demand.team_id}
                      selectedUserIds={selectedAssignees}
                      onChange={setSelectedAssignees}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAssignees} disabled={setAssignees.isPending} className="flex-1 sm:flex-none">
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAssignees(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {formattedAssignees.length > 0 ? (
                    <AssigneeAvatars assignees={formattedAssignees} size="md" />
                  ) : (
                    <span className="text-muted-foreground">Nenhum</span>
                  )}
                  {canManageAssignees && (
                    <Button size="sm" variant="ghost" onClick={handleEditAssignees}>
                      Editar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Time tracking display - per user */}
          {(isInProgress || isInAdjustment || isDelivered) && (
            <div>
              <h3 className="font-semibold mb-2 text-sm md:text-base">Tempo de Execução</h3>
              <UserTimeTrackingDisplay
                demandId={demand.id}
                variant="detail"
                showControls={canControlTimer}
                canControl={canControlTimer}
              />
            </div>
          )}

          {/* Attachments section - result/deliverables - only agents/admins can upload */}
          <div>
            <h3 className="font-semibold mb-2 text-sm md:text-base flex items-center gap-2">
              📎 Anexos / Resultado
            </h3>
            <AttachmentUploader 
              demandId={demand.id} 
              readOnly={!(role === "admin" || role === "moderator" || role === "executor")} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Histórico
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Comentários e atividades da demanda
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <ToggleGroup
                type="single"
                value={interactionFilter}
                onValueChange={(value) => value && setInteractionFilter(value)}
                className="justify-start flex-nowrap"
              >
                <ToggleGroupItem value="all" size="sm" className="text-xs px-2 py-1 h-7 whitespace-nowrap">
                  Todos
                </ToggleGroupItem>
                <ToggleGroupItem value="comment" size="sm" className="text-xs px-2 py-1 h-7 whitespace-nowrap">
                  Comentários
                </ToggleGroupItem>
                <ToggleGroupItem value="adjustment_request" size="sm" className="text-xs px-2 py-1 h-7 whitespace-nowrap data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-600">
                  Ajustes
                </ToggleGroupItem>
                <ToggleGroupItem value="status_change" size="sm" className="text-xs px-2 py-1 h-7 whitespace-nowrap">
                  Status
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <div className="space-y-2">
            <Textarea
              placeholder="Adicionar um comentário..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                handleInputChange();
              }}
              onBlur={stopTyping}
              rows={3}
              className="text-sm md:text-base"
            />
            <InlineFileUploader
              pendingFiles={commentPendingFiles}
              onFilesChange={setCommentPendingFiles}
              disabled={createInteraction.isPending}
              listenToGlobalPaste
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button
                onClick={() => {
                  stopTyping();
                  handleAddComment();
                }}
                disabled={!comment.trim() || createInteraction.isPending}
                className="w-full sm:w-auto"
              >
                {createInteraction.isPending ? "Enviando..." : "Enviar Comentário"}
              </Button>
              <TypingIndicator users={typingUsers} />
            </div>
          </div>

          <div className="space-y-3 md:space-y-4 pt-4">
            {filteredInteractions && filteredInteractions.length > 0 ? (
              filteredInteractions.map((interaction) => {
                const isAdjustmentRequest = interaction.interaction_type === 'adjustment_request';
                const isOwnInteraction = interaction.user_id === user?.id;
                const canEditInteraction = isOwnInteraction && interaction.interaction_type === 'comment';
                const isEditing = editingInteractionId === interaction.id;
                
                // Determinar tipo de ajuste
                const metadata = interaction.metadata as { adjustment_type?: string } | null;
                const interactionAdjustmentType = metadata?.adjustment_type || "external"; // default external para compatibilidade
                const isInternalAdjustment = isAdjustmentRequest && interactionAdjustmentType === "internal";
                const isExternalAdjustment = isAdjustmentRequest && interactionAdjustmentType === "external";
                
                return (
                  <div
                    key={interaction.id}
                    className={`flex gap-2 md:gap-3 p-3 md:p-4 rounded-lg ${
                      isInternalAdjustment 
                        ? 'bg-blue-500/10 border border-blue-500/30' 
                        : isExternalAdjustment
                          ? 'bg-purple-500/10 border border-purple-500/30'
                          : 'bg-muted/50'
                    }`}
                  >
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0">
                      <AvatarImage src={interaction.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {interaction.profiles?.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                          <span className="font-semibold text-xs md:text-sm truncate">
                            {interaction.profiles?.full_name}
                          </span>
                          {isInternalAdjustment && (
                            <span className="text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                              Ajuste Interno
                            </span>
                          )}
                          {isExternalAdjustment && (
                            <span className="text-[10px] md:text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">
                              Ajuste Externo
                            </span>
                          )}
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {format(
                              new Date(interaction.created_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                        {canEditInteraction && !isEditing && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditInteraction(interaction.id, interaction.content || "")}>
                                <Pencil className="h-3 w-3 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteInteraction(interaction.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingInteractionContent}
                            onChange={(e) => setEditingInteractionContent(e.target.value)}
                            rows={2}
                            className="text-xs md:text-sm"
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={handleSaveInteraction}
                              disabled={updateInteraction.isPending || !editingInteractionContent.trim()}
                            >
                              {updateInteraction.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setEditingInteractionId(null);
                                setEditingInteractionContent("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {interaction.content && (
                            <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                              {interaction.content}
                            </p>
                          )}
                          <InteractionAttachments interactionId={interaction.id} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-6 md:py-8 text-sm">
                {interactionFilter === "all" 
                  ? "Nenhuma interação ainda. Seja o primeiro a comentar!" 
                  : `Nenhum ${interactionFilter === "comment" ? "comentário" : interactionFilter === "adjustment_request" ? "ajuste" : "status"} encontrado.`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Demanda</DialogTitle>
            <DialogDescription>
              Atualize as informações da demanda
            </DialogDescription>
          </DialogHeader>
          <DemandEditForm
            demand={{
              id: demand.id,
              title: demand.title,
              description: demand.description,
              status_id: demand.status_id,
              priority: demand.priority,
              due_date: demand.due_date,
              service_id: demand.service_id,
              team_id: demand.team_id,
              board_id: demand.board_id,
            }}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
