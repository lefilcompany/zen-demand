import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor, RichTextDisplay, extractPlainText } from "@/components/ui/rich-text-editor";
import { MentionInput } from "@/components/MentionInput";
import { MentionText } from "@/components/MentionText";
import { LinkifiedText } from "@/components/LinkifiedText";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDemandById, useDemandInteractions, useCreateInteraction, useUpdateInteraction, useDeleteInteraction, useUpdateDemand } from "@/hooks/useDemands";
import { useBoardStatuses } from "@/hooks/useBoardStatuses";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useBoard, useBoards } from "@/hooks/useBoards";
import { ChangeBoardDialog } from "@/components/ChangeBoardDialog";
import { useUploadAttachment } from "@/hooks/useAttachments";
import { InlineFileUploader, PendingFile, uploadPendingFiles } from "@/components/InlineFileUploader";
import { InteractionAttachments } from "@/components/InteractionAttachments";
import { supabase } from "@/integrations/supabase/client";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useAuth } from "@/lib/auth";
import { useUserTimerControl } from "@/hooks/useUserTimeTracking";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { DemandEditForm } from "@/components/DemandEditForm";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { AttachmentCounter } from "@/components/AttachmentCounter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Calendar, Users, MessageSquare, Archive, Pencil, Wrench, Filter, MoreHorizontal, Trash2, AlertTriangle, LayoutGrid, List, ChevronDown, Kanban, CalendarDays, LucideIcon, Share2, Copy } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ShareDemandButton } from "@/components/ShareDemandButton";
import { Link } from "react-router-dom";
import { UserTimeTrackingDisplay } from "@/components/UserTimeTrackingDisplay";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import { formatDemandCode } from "@/lib/demandCodeUtils";
import { copyRichContent } from "@/lib/clipboardUtils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sendAdjustmentPushNotification, sendCommentPushNotification, sendMentionPushNotification } from "@/hooks/useSendPushNotification";
import { extractMentionedUserIds } from "@/lib/mentionUtils";
import { useSendEmail } from "@/hooks/useSendEmail";
import { buildPublicDemandUrl } from "@/lib/demandShareUtils";
import { useRealtimeDemandDetail } from "@/hooks/useRealtimeDemandDetail";
import { DemandPresenceIndicator } from "@/components/DemandPresenceIndicator";
import { RealtimeUpdateIndicator } from "@/components/RealtimeUpdateIndicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/TypingIndicator";
export default function DemandDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Check origin view mode from location state
  const fromState = location.state as {
    from?: string;
    viewMode?: string;
  } | null;
  const cameFromKanban = fromState?.from === "kanban" || document.referrer.includes("/kanban");
  const demandsViewMode = fromState?.viewMode || "table";

  // Determine origin info for breadcrumb and back navigation
  const getOriginInfo = (): {
    label: string;
    icon: LucideIcon;
    path: string;
    viewMode?: string;
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
          viewMode: "calendar"
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
    data: interactions
  } = useDemandInteractions(id!);
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

  // Enable typing indicator
  const {
    typingUsers,
    handleInputChange,
    stopTyping
  } = useTypingIndicator(id);
  const createInteraction = useCreateInteraction();
  const updateInteraction = useUpdateInteraction();
  const deleteInteraction = useDeleteInteraction();
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const uploadAttachment = useUploadAttachment();
  const {
    isTimerRunning,
    startTimer,
    stopTimer,
    isLoading: isTimerLoading
  } = useUserTimerControl(id);
  const sendEmail = useSendEmail();
  const [comment, setComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentPendingFiles, setCommentPendingFiles] = useState<PendingFile[]>([]);
  const [adjustmentPendingFiles, setAdjustmentPendingFiles] = useState<PendingFile[]>([]);
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [interactionFilter, setInteractionFilter] = useState<string>("all");
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editingInteractionContent, setEditingInteractionContent] = useState("");
  const [isChangeBoardDialogOpen, setIsChangeBoardDialogOpen] = useState(false);

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
  const canManageAssignees = !isDeliveredStatus && (boardRole === "admin" || boardRole === "moderator");
  const canEdit = !isDeliveredStatus;
  const canArchive = !isDeliveredStatus;
  const canChangeBoard = !isDeliveredStatus && (boardRole === "admin" || boardRole === "moderator");
  const isCreator = demand?.created_by === user?.id;

  // Permissões de ajuste baseadas no boardRole
  const canRequestInternalAdjustment = demand?.status_id === approvalStatusId && (boardRole === "admin" || boardRole === "moderator");
  const canRequestExternalAdjustment = demand?.status_id === approvalStatusId && boardRole === "requester";
  const canRequestAdjustment = canRequestInternalAdjustment || canRequestExternalAdjustment;
  const isInProgress = demand?.status_id === fazendoStatusId;
  const isInAdjustment = demand?.status_id === adjustmentStatusId;
  const isDelivered = demand?.status_id === deliveredStatusId || demand?.status_id === approvalStatusId;

  // Timer control permissions (same as Kanban)
  const canControlTimer = !isDeliveredStatus && (boardRole === "admin" || boardRole === "moderator" || boardRole === "executor") && (isInProgress || isInAdjustment);
  const filteredInteractions = useMemo(() => {
    if (!interactions) return [];
    if (interactionFilter === "all") return interactions;
    return interactions.filter(i => i.interaction_type === interactionFilter);
  }, [interactions, interactionFilter]);

  // Get the latest adjustment request for highlighting
  const latestAdjustmentRequest = useMemo(() => {
    if (!interactions) return null;
    const adjustmentRequests = interactions.filter(i => i.interaction_type === "adjustment_request");
    return adjustmentRequests.length > 0 ? adjustmentRequests[0] : null; // Already sorted by created_at desc
  }, [interactions]);

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
          status_id: adjustmentStatusId
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
          state: originInfo.viewMode ? {
            viewMode: originInfo.viewMode
          } : undefined
        });
      },
      onError: (error: any) => {
        toast.error("Erro ao arquivar demanda", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  const handleAddComment = async () => {
    if (!comment.trim() || !id) return;
    setIsSendingComment(true);
    let commentContent = comment.trim();
    
    // Upload any inline base64 images to storage before saving
    if (commentContent.includes('data:image')) {
      try {
        const { uploadInlineImages } = await import("@/lib/imageUploadUtils");
        commentContent = await uploadInlineImages(commentContent);
      } catch (err) {
        console.error("Error uploading inline images:", err);
        commentContent = commentContent.replace(/<img\s+src="data:[^"]*"[^>]*\/?>/g, '[imagem não enviada]');
      }
    }
    
    const isAdjustmentMode = interactionFilter === "adjustment_request";
    const interactionType = isAdjustmentMode ? "adjustment_request" : "comment";
    const determinedAdjustmentType: "internal" | "external" = boardRole === 'requester' ? 'external' : 'internal';
    
    createInteraction.mutate({
      demand_id: id,
      interaction_type: interactionType,
      content: isAdjustmentMode ? `Solicitou ajuste: ${commentContent}` : commentContent,
      ...(isAdjustmentMode && { metadata: { adjustment_type: determinedAdjustmentType } })
    }, {
      onSuccess: async createdInteraction => {
        // If in adjustment mode, update demand status
        if (isAdjustmentMode && adjustmentStatusId) {
          try {
            await new Promise<void>((resolve, reject) => {
              updateDemand.mutate({ id, status_id: adjustmentStatusId }, {
                onSuccess: () => resolve(),
                onError: error => reject(error)
              });
            });
          } catch (error) {
            console.error("Error updating status to Em Ajuste:", error);
          }
        }
        
        // Upload pending files
        if (commentPendingFiles.length > 0 && createdInteraction?.id) {
          const { success, failed } = await uploadPendingFiles(id, commentPendingFiles, uploadAttachment, createdInteraction.id);
          if (failed > 0) {
            toast.warning(`${isAdjustmentMode ? 'Ajuste' : 'Comentário'} adicionado! ${success} arquivo(s) enviado(s), ${failed} falhou(ram)`);
          } else {
            toast.success(`${isAdjustmentMode ? 'Ajuste' : 'Comentário'} adicionado com ${success} anexo(s)!`);
          }
          setCommentPendingFiles([]);
        } else {
          const isInternal = determinedAdjustmentType === "internal";
          const typeLabel = isInternal ? "Ajuste Interno" : "Ajuste Externo";
          toast.success(isAdjustmentMode ? `${typeLabel} solicitado com sucesso!` : "Comentário adicionado!");
        }
        
        // Clear comment and stop sending state immediately
        setComment("");
        setIsSendingComment(false);
        stopTyping();

        // Fire notifications in the background (non-blocking)
        fireCommentNotifications({
          commentContent,
          isAdjustmentMode,
          determinedAdjustmentType,
          demandId: id,
          demandTitle: demand?.title || "",
          boardName: currentBoard?.name,
          userId: user?.id || "",
          assignees: assignees || [],
          createdBy: demand?.created_by || "",
        }).catch(err => console.error("Error sending notifications:", err));
      },
      onError: (error: any) => {
        setIsSendingComment(false);
        toast.error("Erro ao adicionar comentário", {
          description: getErrorMessage(error)
        });
      }
    });
  };

  // Background notification handler - runs after comment is already visible
  const fireCommentNotifications = async ({
    commentContent, isAdjustmentMode, determinedAdjustmentType, demandId, demandTitle, boardName, userId, assignees: notifyAssignees, createdBy
  }: {
    commentContent: string; isAdjustmentMode: boolean; determinedAdjustmentType: "internal" | "external";
    demandId: string; demandTitle: string; boardName?: string; userId: string;
    assignees: { user_id: string }[]; createdBy: string;
  }) => {
    const usersToNotify = new Set<string>();
    notifyAssignees.forEach(a => usersToNotify.add(a.user_id));
    if (createdBy) usersToNotify.add(createdBy);
    usersToNotify.delete(userId);
    const notifyUserIds = Array.from(usersToNotify);

    if (notifyUserIds.length > 0) {
      const { data: currentProfile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
      const commenterName = currentProfile?.full_name || "Alguém";

      if (isAdjustmentMode) {
        const isInternal = determinedAdjustmentType === "internal";
        const boardPrefix = boardName ? `[${boardName}] ` : "";
        const notificationTitle = isInternal ? `${boardPrefix}Ajuste interno solicitado` : `${boardPrefix}Ajuste externo solicitado`;
        const notificationMessage = isInternal 
          ? `Foi solicitado um ajuste interno na demanda "${demandTitle}": ${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}`
          : `O cliente solicitou um ajuste na demanda "${demandTitle}": ${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}`;
        
        const notifications = notifyUserIds.map(uid => ({
          user_id: uid, title: notificationTitle, message: notificationMessage, type: "warning", link: `/demands/${demandId}`
        }));
        await supabase.from("notifications").insert(notifications);

        sendAdjustmentPushNotification({
          assigneeIds: notifyUserIds, demandId, demandTitle, reason: commentContent, isInternal, boardName
        }).catch(err => console.error("Error sending push notification:", err));

        const publicUrl = await buildPublicDemandUrl(demandId, userId);
        const typeLabel = isInternal ? "Ajuste Interno" : "Ajuste Externo";
        for (const uid of notifyUserIds) {
          try {
            const { data: userProfile } = await supabase.from("profiles").select("full_name").eq("id", uid).single();
            await supabase.functions.invoke("send-email", {
              body: {
                to: uid,
                subject: `🔧 ${boardName ? `[${boardName}] ` : ""}${typeLabel} solicitado: ${demandTitle}`,
                template: "notification",
                templateData: {
                  title: notificationTitle,
                  message: `${isInternal ? 'Foi solicitado um ajuste interno' : 'O cliente solicitou um ajuste'} na demanda "${demandTitle}".\n\nMotivo: ${commentContent}`,
                  actionUrl: publicUrl, actionText: "Ver Demanda", userName: userProfile?.full_name || "Usuário", type: "warning" as const
                }
              }
            });
          } catch (emailError) {
            console.error("Error sending adjustment email:", emailError);
          }
        }
      } else {
        const notifications = notifyUserIds.map(uid => ({
          user_id: uid, title: "Novo comentário",
          message: `${commenterName} comentou na demanda "${demandTitle}": ${commentContent.substring(0, 100)}${commentContent.length > 100 ? "..." : ""}`,
          type: "info", link: `/demands/${demandId}`
        }));
        await supabase.from("notifications").insert(notifications);

        sendCommentPushNotification({
          userIds: notifyUserIds, demandId, demandTitle, commenterName, commentPreview: commentContent
        }).catch(err => console.error("Error sending comment push notification:", err));

        const publicUrl = await buildPublicDemandUrl(demandId, userId);
        for (const uid of notifyUserIds) {
          sendEmail.mutate({
            to: uid, subject: `💬 Novo comentário em "${demandTitle}"`,
            template: 'notification',
            templateData: {
              title: "Novo comentário na demanda",
              message: `${commenterName} comentou na demanda "${demandTitle}":\n\n"${commentContent.substring(0, 200)}${commentContent.length > 200 ? "..." : ""}"`,
              actionUrl: publicUrl, actionText: "Ver demanda", type: 'info'
            }
          });
        }
      }
    }

    // Handle mention notifications
    const mentionedUserIds = extractMentionedUserIds(commentContent);
    const mentionedToNotify = mentionedUserIds.filter(mid => mid !== userId);
    if (mentionedToNotify.length > 0) {
      const { data: currentProfile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
      const mentionerName = currentProfile?.full_name || "Alguém";

      const mentionNotifications = mentionedToNotify.map(mentionedUserId => ({
        user_id: mentionedUserId, title: "Você foi mencionado",
        message: `${mentionerName} mencionou você em um comentário na demanda "${demandTitle}"`,
        type: "mention", link: `/demands/${demandId}`
      }));
      await supabase.from("notifications").insert(mentionNotifications);

      for (const mentionedUserId of mentionedToNotify) {
        sendMentionPushNotification({
          mentionedUserId, demandId, demandTitle, mentionerName
        }).catch(err => console.error("Error sending mention push notification:", err));
      }

      const mentionPublicUrl = await buildPublicDemandUrl(demandId, userId);
      for (const mentionedUserId of mentionedToNotify) {
        sendEmail.mutate({
          to: mentionedUserId, subject: `💬 ${mentionerName} mencionou você em "${demandTitle}"`,
          template: 'notification',
          templateData: {
            title: "Você foi mencionado em um comentário",
            message: `${mentionerName} mencionou você na demanda "${demandTitle}":\n\n"${commentContent.substring(0, 200)}${commentContent.length > 200 ? "..." : ""}"`,
            actionUrl: mentionPublicUrl, actionText: "Ver demanda", type: 'info'
          }
        });
      }
    }
  };
  const handleEditInteraction = (interactionId: string, content: string) => {
    setEditingInteractionId(interactionId);
    setEditingInteractionContent(content);
  };
  const handleSaveInteraction = () => {
    if (!id || !editingInteractionId || !editingInteractionContent.trim()) return;
    updateInteraction.mutate({
      id: editingInteractionId,
      demandId: id,
      content: editingInteractionContent.trim()
    }, {
      onSuccess: () => {
        toast.success("Comentário atualizado!");
        setEditingInteractionId(null);
        setEditingInteractionContent("");
      },
      onError: (error: any) => {
        toast.error("Erro ao atualizar comentário", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  const handleDeleteInteraction = (interactionId: string) => {
    if (!id) return;
    deleteInteraction.mutate({
      id: interactionId,
      demandId: id
    }, {
      onSuccess: () => {
        toast.success("Comentário excluído!");
      },
      onError: (error: any) => {
        toast.error("Erro ao excluir comentário", {
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
        state: originInfo.viewMode ? {
          viewMode: originInfo.viewMode
        } : undefined
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
      <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageBreadcrumb items={[{
          label: originInfo.label,
          href: originInfo.path,
          icon: originInfo.icon,
          state: originInfo.viewMode ? {
            viewMode: originInfo.viewMode
          } : undefined
        }, {
          label: demand?.title || "Carregando...",
          isCurrent: true
        }]} />
        {id && <DemandPresenceIndicator demandId={id} />}
      </div>

      {/* Adjustment Alert - Shows when demand is in "Em Ajuste" status */}
      {isInAdjustment && latestAdjustmentRequest && (() => {
        const latestMetadata = latestAdjustmentRequest.metadata as {
          adjustment_type?: string;
        } | null;
        const latestType = latestMetadata?.adjustment_type || "external";
        const isInternalAlert = latestType === "internal";
        return <Alert className={isInternalAlert ? "border-blue-500/50 bg-blue-500/10" : "border-purple-500/50 bg-purple-500/10"}>
            <Wrench className={`h-4 w-4 ${isInternalAlert ? "text-blue-600" : "text-purple-600"}`} />
            <AlertTitle className={`${isInternalAlert ? "text-blue-600" : "text-purple-600"} font-semibold`}>
              {isInternalAlert ? "Ajuste Interno Solicitado" : "Ajuste Externo Solicitado"}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2 overflow-hidden">
              <LinkifiedText 
                text={latestAdjustmentRequest.content || ""} 
                className="text-xs sm:text-sm text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] block" 
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">
                  {latestAdjustmentRequest.profiles?.full_name}
                </span>
                <span>•</span>
                <span>
                  {format(new Date(latestAdjustmentRequest.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR
                })}
                </span>
              </div>
            </AlertDescription>
          </Alert>;
      })()}

      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="space-y-2 min-w-0 w-full overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                {demand.board_sequence_number && <Badge variant="outline" className="text-xs sm:text-sm bg-muted/50 text-muted-foreground border-muted-foreground/20 font-mono shrink-0">
                    {formatDemandCode(demand.board_sequence_number)}
                  </Badge>}
              </div>
              <CardTitle className="text-base sm:text-lg md:text-2xl break-words [overflow-wrap:anywhere]">{demand.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {demand.priority && <Badge variant="outline">{demand.priority}</Badge>}
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
                        {role === 'requester' ? "Descreva o que precisa ser ajustado nesta demanda. A equipe receberá sua solicitação." : "Descreva o ajuste necessário nesta demanda."}
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
                      <Button onClick={handleRequestAdjustment} disabled={!adjustmentReason.trim() || updateDemand.isPending} className={role === 'requester' ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}>
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
                    {statuses?.map(status => <DropdownMenuItem key={status.id} onClick={() => {
                    if (status.id !== demand.status_id) {
                      updateDemand.mutate({
                        id: demand.id,
                        status_id: status.id
                      }, {
                        onSuccess: () => {
                          toast.success(`Status alterado para "${status.name}"!`);
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 pt-0 md:pt-0">
          {/* Time tracking display - prominent position (hidden for board requesters) */}
          {(isInProgress || isInAdjustment || isDelivered) && boardRole !== "requester" && (
            <UserTimeTrackingDisplay demandId={demand.id} variant="detail" showControls={canControlTimer} canControl={canControlTimer} canEdit={boardRole === "admin" || boardRole === "moderator" || boardRole === "executor"} />
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



          {/* Attachments section - result/deliverables - only agents/admins can upload */}
          <div>
            
            <AttachmentUploader demandId={demand.id} readOnly={!(boardRole === "admin" || boardRole === "moderator" || boardRole === "executor")} demandTitle={demand.title} demandCreatedBy={demand.created_by} />
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
              <ToggleGroup type="single" value={interactionFilter} onValueChange={value => value && setInteractionFilter(value)} className="justify-start flex-nowrap">
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
            <MentionInput 
              placeholder={interactionFilter === "adjustment_request" 
                ? "Descreva o ajuste necessário... Use @ para mencionar alguém" 
                : "Adicionar um comentário... Use @ para mencionar alguém"
              } 
              value={comment} 
              boardId={demand.board_id} 
              onChange={value => {
                setComment(value);
                handleInputChange();
              }} 
              onBlur={stopTyping} 
              className={cn(
                "text-sm md:text-base min-h-[80px]",
                interactionFilter === "adjustment_request" && "border-purple-500/50 focus-within:border-purple-500"
              )} 
            />
            <InlineFileUploader pendingFiles={commentPendingFiles} onFilesChange={setCommentPendingFiles} disabled={createInteraction.isPending} listenToGlobalPaste />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button 
                onClick={() => {
                  stopTyping();
                  handleAddComment();
                }} 
                disabled={!comment.trim() || isSendingComment || createInteraction.isPending} 
                className={cn(
                  "w-full sm:w-auto",
                  interactionFilter === "adjustment_request" && "bg-purple-600 hover:bg-purple-700"
                )}
              >
                {isSendingComment || createInteraction.isPending 
                  ? "Enviando..." 
                  : interactionFilter === "adjustment_request" 
                    ? "Solicitar Ajuste" 
                    : "Enviar Comentário"
                }
              </Button>
              <TypingIndicator users={typingUsers} />
            </div>
          </div>

          <div className="space-y-3 md:space-y-4 pt-4">
            {filteredInteractions && filteredInteractions.length > 0 ? filteredInteractions.map(interaction => {
              const isAdjustmentRequest = interaction.interaction_type === 'adjustment_request';
              const isOwnInteraction = interaction.user_id === user?.id;
              const canEditInteraction = isOwnInteraction && interaction.interaction_type === 'comment';
              const isEditing = editingInteractionId === interaction.id;

              // Determinar tipo de ajuste
              const metadata = interaction.metadata as {
                adjustment_type?: string;
              } | null;
              const interactionAdjustmentType = metadata?.adjustment_type || "external"; // default external para compatibilidade
              const isInternalAdjustment = isAdjustmentRequest && interactionAdjustmentType === "internal";
              const isExternalAdjustment = isAdjustmentRequest && interactionAdjustmentType === "external";
              return <div key={interaction.id} className={`flex gap-2 md:gap-3 p-3 md:p-4 rounded-lg ${isInternalAdjustment ? 'bg-blue-500/10 border border-blue-500/30' : isExternalAdjustment ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-muted/50'}`}>
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0">
                      <AvatarImage src={interaction.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {interaction.profiles?.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                          <button type="button" onClick={() => navigate(`/user/${interaction.user_id}`)} className="font-semibold text-xs md:text-sm truncate hover:text-primary hover:underline cursor-pointer transition-colors text-left">
                            {interaction.profiles?.full_name}
                          </button>
                          {isInternalAdjustment && <span className="text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                              Ajuste Interno
                            </span>}
                          {isExternalAdjustment && <span className="text-[10px] md:text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">
                              Ajuste Externo
                            </span>}
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {format(new Date(interaction.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}
                          </span>
                        </div>
                        {!isEditing && <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => copyRichContent(interaction.content || "")}>
                                <Copy className="h-3 w-3 mr-2" />
                                Copiar
                              </DropdownMenuItem>
                              {canEditInteraction && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditInteraction(interaction.id, interaction.content || "")}>
                                    <Pencil className="h-3 w-3 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteInteraction(interaction.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>}
                      </div>
                      {isEditing ? <div className="space-y-2">
                          <MentionInput 
                            value={editingInteractionContent} 
                            onChange={setEditingInteractionContent} 
                            boardId={demand.board_id}
                            placeholder="Edite seu comentário... Use @ para mencionar alguém"
                            className="text-sm md:text-base min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveInteraction} disabled={updateInteraction.isPending || !editingInteractionContent.trim()}>
                              {updateInteraction.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                        setEditingInteractionId(null);
                        setEditingInteractionContent("");
                      }}>
                              Cancelar
                            </Button>
                          </div>
                        </div> : <>
                          {interaction.content && <RichTextDisplay content={interaction.content} className="text-xs md:text-sm" />}
                          <InteractionAttachments interactionId={interaction.id} />
                        </>}
                    </div>
                  </div>;
            }) : <p className="text-center text-muted-foreground py-6 md:py-8 text-sm">
                {interactionFilter === "all" ? "Nenhuma interação ainda. Seja o primeiro a comentar!" : `Nenhum ${interactionFilter === "comment" ? "comentário" : interactionFilter === "adjustment_request" ? "ajuste" : "status"} encontrado.`}
              </p>}
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