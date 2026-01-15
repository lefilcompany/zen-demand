import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { extractPlainText } from "@/components/ui/rich-text-editor";
import { RichTextEditorWithMentions, extractMentionedUserIds } from "@/components/ui/rich-text-editor-with-mentions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { useUpdateDemand, useDemandStatuses, useCreateInteraction } from "@/hooks/useDemands";
import { useDemandAssignees } from "@/hooks/useDemandAssignees";
import { useUploadAttachment } from "@/hooks/useAttachments";
import { InlineFileUploader, PendingFile, uploadPendingFiles } from "@/components/InlineFileUploader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sendAdjustmentPushNotification } from "@/hooks/useSendPushNotification";
import { useTeamRole } from "@/hooks/useTeamRole";

export type AdjustmentType = "internal" | "external";

interface KanbanAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandId: string | null;
  demandTitle: string | undefined;
  demandCreatedBy: string | undefined;
  teamId: string | undefined;
  boardId: string | null;
  boardName?: string;
}

export const KanbanAdjustmentDialog = React.memo(function KanbanAdjustmentDialog({
  open,
  onOpenChange,
  demandId,
  demandTitle,
  demandCreatedBy,
  teamId,
  boardId,
  boardName,
}: KanbanAdjustmentDialogProps) {
  // Estado LOCAL do textarea - não propaga re-render ao pai
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>();
  
  // Get user role in the team to auto-determine adjustment type
  // Using teamId passed directly for immediate role lookup (no extra query needed)
  const { data: userRole, isLoading: isLoadingRole } = useTeamRole(open && teamId ? teamId : null);
  
  // Auto-determine adjustment type based on user role
  // Requesters = external, everyone else (admin, moderator, executor) = internal
  const adjustmentType = useMemo<AdjustmentType>(() => {
    if (userRole === 'requester') return 'external';
    return 'internal';
  }, [userRole]);
  const { user } = useAuth();
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();
  const createInteraction = useCreateInteraction();
  const uploadAttachment = useUploadAttachment();
  
  // Query movida para dentro do Dialog - só busca quando está aberto
  const { data: assignees } = useDemandAssignees(open ? demandId : null);
  
  const adjustmentStatusId = statuses?.find((s) => s.name === "Em Ajuste")?.id;

  // Reset reason when dialog opens
  useEffect(() => {
    if (open) {
      setReason("");
      setIsSubmitting(false);
      setPendingFiles([]);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setReason("");
    setIsSubmitting(false);
    setPendingFiles([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!demandId || !adjustmentStatusId || !reason.trim()) return;
    
    if (!user) {
      toast.error("Você precisa estar autenticado para solicitar ajustes");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isInternal = adjustmentType === "internal";
      const typeLabel = isInternal ? "Ajuste Interno" : "Ajuste Externo";
      
      // Criar interação de solicitação de ajuste com metadata do tipo
      await new Promise<void>((resolve, reject) => {
        createInteraction.mutate(
          {
            demand_id: demandId,
            interaction_type: "adjustment_request",
            content: reason.trim(),
            metadata: { adjustment_type: adjustmentType },
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
      
      // Atualizar status da demanda para "Em Ajuste"
      await new Promise<void>((resolve, reject) => {
        updateDemand.mutate(
          { id: demandId, status_id: adjustmentStatusId },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
      
      toast.success(`${typeLabel} solicitado com sucesso!`);
      
      // Upload pending files
      if (pendingFiles.length > 0) {
        const { success, failed } = await uploadPendingFiles(demandId, pendingFiles, uploadAttachment);
        if (failed > 0) {
          toast.warning(`${success} arquivo(s) enviado(s), ${failed} falhou(ram)`);
        }
        setPendingFiles([]);
      }
      
      // Notify all assignees, the creator, AND mentioned users about the adjustment request
      const usersToNotify = new Set<string>();
      
      // Add all assignees
      assignees?.forEach(a => usersToNotify.add(a.user_id));
      
      // Always add demand creator (solicitante)
      if (demandCreatedBy) {
        usersToNotify.add(demandCreatedBy);
      }
      
      // Add mentioned users from the reason content
      const mentionedUserIds = extractMentionedUserIds(reason.trim());
      mentionedUserIds.forEach(id => usersToNotify.add(id));
      
      // Remove current user from notification list
      if (user?.id) {
        usersToNotify.delete(user.id);
      }
      
      const notifyUserIds = Array.from(usersToNotify);
      
      if (notifyUserIds.length > 0) {
        const boardPrefix = boardName ? `[${boardName}] ` : "";
        const notificationTitle = isInternal ? `${boardPrefix}Ajuste interno solicitado` : `${boardPrefix}Ajuste externo solicitado`;
        const plainReason = extractPlainText(reason.trim());
        const notificationMessage = isInternal 
          ? `Foi solicitado um ajuste interno na demanda "${demandTitle}": ${plainReason.substring(0, 100)}${plainReason.length > 100 ? '...' : ''}`
          : `O cliente solicitou um ajuste na demanda "${demandTitle}": ${plainReason.substring(0, 100)}${plainReason.length > 100 ? '...' : ''}`;
        
        const notifications = notifyUserIds.map((userId) => ({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: "warning",
          link: `/demands/${demandId}`,
        }));
        
        await supabase.from("notifications").insert(notifications);
        
        // Send push notifications
        sendAdjustmentPushNotification({
          assigneeIds: notifyUserIds,
          demandId,
          demandTitle: demandTitle || "",
          reason: reason.trim(),
          isInternal,
          boardName,
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
                subject: `🔧 ${typeLabel} solicitado: ${demandTitle}`,
                template: "notification",
                templateData: {
                  title: notificationTitle,
                  message: `${isInternal ? 'Foi solicitado um ajuste interno' : 'O cliente solicitou um ajuste'} na demanda "${demandTitle}".\n\nMotivo: ${plainReason}`,
                  actionUrl: `${window.location.origin}/demands/${demandId}`,
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
      
      handleClose();
    } catch (error: any) {
      console.error("Erro ao solicitar ajuste:", error);
      toast.error("Erro ao solicitar ajuste", {
        description: getErrorMessage(error),
      });
      setIsSubmitting(false);
    }
  }, [demandId, adjustmentStatusId, reason, user, assignees, demandTitle, demandCreatedBy, adjustmentType, createInteraction, updateDemand, handleClose, pendingFiles, uploadAttachment]);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  }, []);

  const isInternal = adjustmentType === "internal";
  const dialogTitle = isInternal ? "Solicitar Ajuste Interno" : "Solicitar Ajuste Externo";
  const dialogDescription = isInternal 
    ? `Descreva o ajuste interno necessário na demanda "${demandTitle}".`
    : `Descreva o que precisa ser ajustado na demanda "${demandTitle}".`;
  const buttonColor = isInternal 
    ? "bg-blue-600 hover:bg-blue-700" 
    : "bg-amber-600 hover:bg-amber-700";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      } else {
        onOpenChange(isOpen);
      }
    }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Motivo do ajuste <span className="text-destructive">*</span>
            </label>
            <RichTextEditorWithMentions
              value={reason}
              onChange={setReason}
              minHeight="120px"
              placeholder="Descreva o que precisa ser corrigido ou alterado... Use @ para mencionar"
              boardId={boardId}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Anexos</label>
            <InlineFileUploader
              pendingFiles={pendingFiles}
              onFilesChange={setPendingFiles}
              disabled={isSubmitting}
              listenToGlobalPaste={!isSubmitting}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            className={buttonColor}
          >
            {isSubmitting ? "Enviando..." : isInternal ? "Solicitar Ajuste Interno" : "Solicitar Ajuste Externo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
