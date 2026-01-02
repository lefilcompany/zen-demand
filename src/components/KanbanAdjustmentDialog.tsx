import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

export type AdjustmentType = "internal" | "external";

interface KanbanAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandId: string | null;
  demandTitle: string | undefined;
  adjustmentType: AdjustmentType;
}

export const KanbanAdjustmentDialog = React.memo(function KanbanAdjustmentDialog({
  open,
  onOpenChange,
  demandId,
  demandTitle,
  adjustmentType,
}: KanbanAdjustmentDialogProps) {
  // Estado LOCAL do textarea - não propaga re-render ao pai
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
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
      
      // Enviar notificações para os responsáveis
      if (assignees && assignees.length > 0) {
        const notificationTitle = isInternal ? "Ajuste interno solicitado" : "Ajuste externo solicitado";
        const notificationMessage = isInternal 
          ? `Foi solicitado um ajuste interno na demanda "${demandTitle}": ${reason.trim().substring(0, 100)}${reason.length > 100 ? '...' : ''}`
          : `O cliente solicitou um ajuste na demanda "${demandTitle}": ${reason.trim().substring(0, 100)}${reason.length > 100 ? '...' : ''}`;
        
        const notifications = assignees.map((assignee) => ({
          user_id: assignee.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "warning",
          link: `/demands/${demandId}`,
        }));
        
        await supabase.from("notifications").insert(notifications);
        
        // Send push notifications
        const assigneeIds = assignees.map(a => a.user_id);
        sendAdjustmentPushNotification({
          assigneeIds,
          demandId,
          demandTitle: demandTitle || "",
          reason: reason.trim(),
          isInternal,
        }).catch(err => console.error("Error sending push notification:", err));
        
        // Send email notifications
        for (const assignee of assignees) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: assignee.user_id,
                subject: `${typeLabel} solicitado: ${demandTitle}`,
                template: "notification",
                templateData: {
                  title: notificationTitle,
                  message: `${isInternal ? 'Foi solicitado um ajuste interno' : 'O cliente solicitou um ajuste'} na demanda "${demandTitle}".\n\nMotivo: ${reason.trim()}`,
                  actionUrl: `https://pla.soma.lefil.com.br/demands/${demandId}`,
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
      
      handleClose();
    } catch (error: any) {
      console.error("Erro ao solicitar ajuste:", error);
      toast.error("Erro ao solicitar ajuste", {
        description: getErrorMessage(error),
      });
      setIsSubmitting(false);
    }
  }, [demandId, adjustmentStatusId, reason, user, assignees, demandTitle, adjustmentType, createInteraction, updateDemand, handleClose]);

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
            <label htmlFor="kanban-adjustment-reason" className="text-sm font-medium">
              Motivo do ajuste <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="kanban-adjustment-reason"
              placeholder="Descreva o que precisa ser corrigido ou alterado..."
              value={reason}
              onChange={handleReasonChange}
              rows={4}
              maxLength={1000}
              className="resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/1000
            </p>
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
