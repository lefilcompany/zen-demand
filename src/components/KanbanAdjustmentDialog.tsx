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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface KanbanAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandId: string | null;
  demandTitle: string | undefined;
}

export const KanbanAdjustmentDialog = React.memo(function KanbanAdjustmentDialog({
  open,
  onOpenChange,
  demandId,
  demandTitle,
}: KanbanAdjustmentDialogProps) {
  // Estado LOCAL do textarea - não propaga re-render ao pai
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { data: statuses } = useDemandStatuses();
  const updateDemand = useUpdateDemand();
  const createInteraction = useCreateInteraction();
  
  // Query movida para dentro do Dialog - só busca quando está aberto
  const { data: assignees } = useDemandAssignees(open ? demandId : null);
  
  const adjustmentStatusId = statuses?.find((s) => s.name === "Em Ajuste")?.id;

  // Reset reason when dialog opens
  useEffect(() => {
    if (open) {
      setReason("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setReason("");
    setIsSubmitting(false);
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
      // Criar interação de solicitação de ajuste
      await new Promise<void>((resolve, reject) => {
        createInteraction.mutate(
          {
            demand_id: demandId,
            interaction_type: "adjustment_request",
            content: reason.trim(),
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
      
      toast.success("Ajuste solicitado com sucesso!");
      
      // Enviar notificações para os responsáveis
      if (assignees && assignees.length > 0) {
        const notifications = assignees.map((assignee) => ({
          user_id: assignee.user_id,
          title: "Ajuste solicitado",
          message: `Foi solicitado ajuste na demanda "${demandTitle}": ${reason.trim().substring(0, 100)}${reason.length > 100 ? '...' : ''}`,
          type: "warning",
          link: `/demands/${demandId}`,
        }));
        
        await supabase.from("notifications").insert(notifications);
        
        for (const assignee of assignees) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: assignee.user_id,
                subject: `Ajuste solicitado: ${demandTitle}`,
                template: "notification",
                templateData: {
                  title: "Ajuste Solicitado",
                  message: `Foi solicitado um ajuste na demanda "${demandTitle}".\n\nMotivo: ${reason.trim()}`,
                  actionUrl: `${window.location.origin}/demands/${demandId}`,
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
  }, [demandId, adjustmentStatusId, reason, user, assignees, demandTitle, createInteraction, updateDemand, handleClose]);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  }, []);

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
          <DialogTitle>Solicitar ajuste</DialogTitle>
          <DialogDescription>
            Descreva o que precisa ser ajustado na demanda "{demandTitle}".
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
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? "Enviando..." : "Solicitar Ajuste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
