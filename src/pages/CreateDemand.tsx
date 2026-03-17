import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useCanCreateDemandOnBoard } from "@/hooks/useBoardScope";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useHasBoardServices, useCanCreateWithService } from "@/hooks/useBoardServices";
import { ServiceSelector } from "@/components/ServiceSelector";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ScopeProgressBar } from "@/components/ScopeProgressBar";
import { InlineFileUploader, PendingFile, uploadPendingFiles } from "@/components/InlineFileUploader";
import { useUploadAttachment } from "@/hooks/useAttachments";
import { RecurrenceConfig, RecurrenceData, defaultRecurrenceData } from "@/components/RecurrenceConfig";
import { useCreateRecurringDemand } from "@/hooks/useRecurringDemands";
import { AlertTriangle, Ban, CloudOff, WifiOff, Package } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { calculateBusinessDueDate, formatDueDateForInput } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useTranslation } from "react-i18next";

export default function CreateDemand() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOffline } = useOfflineStatus();
  const createDemand = useCreateDemand();
  const { selectedTeamId, teams } = useSelectedTeam();
  const { selectedBoardId, currentBoard } = useSelectedBoard();
  const { data: statuses } = useDemandStatuses();
  const { 
    canCreate, 
    isTeamActive, 
    isWithinLimit, 
    hasBoardLimit, 
    monthlyCount, 
    limit 
  } = useCanCreateDemandOnBoard(selectedBoardId, selectedTeamId);
  const { data: role } = useTeamRole(selectedTeamId);
  const { data: boardRole } = useBoardRole(selectedBoardId);
  const { hasBoardServices } = useHasBoardServices(selectedBoardId);

  const canAssignResponsibles = role !== "requester";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priority, setPriority] = useState("média");
  const [dueDate, setDueDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceData>(defaultRecurrenceData);
  
  const uploadAttachment = useUploadAttachment();
  const createRecurringDemand = useCreateRecurringDemand();

  const { canCreate: canCreateWithService, serviceInfo } = useCanCreateWithService(
    selectedBoardId, 
    serviceId && serviceId !== "none" ? serviceId : null
  );

  useEffect(() => {
    if (statuses && statuses.length > 0 && !statusId) {
      const defaultStatus = statuses.find(s => s.name === "A Iniciar") || statuses[0];
      setStatusId(defaultStatus.id);
    }
  }, [statuses, statusId]);

  const handleServiceChange = (newServiceId: string, estimatedHours?: number) => {
    setServiceId(newServiceId);
    if (newServiceId !== "none" && estimatedHours) {
      const calculatedDate = calculateBusinessDueDate(estimatedHours);
      setDueDate(formatDueDateForInput(calculatedDate));
    }
  };

  if (role === "requester") {
    return <Navigate to="/demands/request" replace />;
  }


    if (!hasBoardServices) return true;
    if (!serviceId || serviceId === "none") return false;
    if (canCreateWithService === false) return false;
    return true;
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTeamId || !selectedBoardId || !statusId || !canCreate) return;

    if (hasBoardServices && (!serviceId || serviceId === "none")) {
      toast.error("Selecione um serviço para esta demanda");
      return;
    }

    if (canCreateWithService === false) {
      toast.error("Limite mensal deste serviço foi atingido");
      return;
    }

    let finalDescription = description.trim() || undefined;
    if (finalDescription && finalDescription.includes('data:image')) {
      try {
        const { uploadInlineImages } = await import("@/lib/imageUploadUtils");
        finalDescription = await uploadInlineImages(finalDescription);
      } catch (err) {
        console.error("Error uploading inline images in description:", err);
        finalDescription = finalDescription.replace(/<img\s+[^>]*src="data:[^"]*"[^>]*\/?>/g, '[imagem não enviada]');
      }
    }

    createDemand.mutate(
      {
        title: title.trim(),
        description: finalDescription,
        team_id: selectedTeamId,
        board_id: selectedBoardId,
        status_id: statusId,
        priority,
        due_date: dueDate || undefined,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
      },
      {
        onSuccess: async (demand) => {
          const wasCreatedOffline = (demand as any)?._isOffline;
          
          if (!wasCreatedOffline && assigneeIds.length > 0 && demand) {
            const { error: assignError } = await supabase
              .from("demand_assignees")
              .insert(
                assigneeIds.map((userId) => ({
                  demand_id: demand.id,
                  user_id: userId,
                }))
              );
            
            if (assignError) {
              console.error("Erro ao atribuir responsáveis:", assignError);
              toast.warning("Demanda criada, mas houve um erro ao atribuir responsáveis");
            }
          }
          
          if (!wasCreatedOffline && pendingFiles.length > 0 && demand) {
            const { success, failed } = await uploadPendingFiles(demand.id, pendingFiles, uploadAttachment);
            if (failed > 0) {
              toast.warning(`${success} arquivo(s) enviado(s), ${failed} falhou(ram)`);
            } else if (success > 0) {
              toast.success(`${success} arquivo(s) anexado(s)`);
            }
            setPendingFiles([]);
          }
          
          if (!wasCreatedOffline && recurrence.enabled && demand && selectedTeamId && selectedBoardId) {
            try {
              await createRecurringDemand.mutateAsync({
                team_id: selectedTeamId,
                board_id: selectedBoardId,
                title: title.trim(),
                description: description.trim() || null,
                priority,
                status_id: statusId,
                service_id: serviceId && serviceId !== "none" ? serviceId : null,
                assignee_ids: assigneeIds,
                frequency: recurrence.frequency,
                weekdays: (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") ? recurrence.weekdays : [],
                day_of_month: recurrence.frequency === "monthly" ? recurrence.dayOfMonth : null,
                start_date: recurrence.startDate,
                end_date: recurrence.endDate || null,
              });
            } catch (recError) {
              console.error("Erro ao criar recorrência:", recError);
              toast.warning("Demanda criada, mas houve um erro ao configurar a recorrência");
            }
          }

          if (wasCreatedOffline) {
            toast.success(t("sync.createdOffline"), {
              description: t("sync.createdOfflineDescription"),
              icon: <CloudOff className="h-4 w-4" />,
            });
          } else {
            toast.success("Demanda criada com sucesso!");
          }
          navigate("/kanban");
        },
        onError: (error: any) => {
          toast.error("Erro ao criar demanda", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const isSubmitDisabled = createDemand.isPending || 
    !title.trim() || 
    !statusId || 
    !selectedBoardId || 
    canCreate === false || 
    !isServiceValid();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-xl font-bold">Nova Demanda</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Criar demanda para o quadro <span className="font-medium text-primary">{currentBoard?.name}</span>
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Alerts */}
          <div className="space-y-3 mb-4">
            {isOffline && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <WifiOff className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  Você está offline. A demanda será salva localmente e sincronizada quando a conexão for restaurada.
                </AlertDescription>
              </Alert>
            )}

            {!isTeamActive && (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" />
                <AlertDescription>
                  O contrato desta equipe está inativo. Não é possível criar novas demandas.
                </AlertDescription>
              </Alert>
            )}

            {hasBoardLimit && isTeamActive && (
              <div className="rounded-lg border border-border bg-card p-3">
                <ScopeProgressBar used={monthlyCount} limit={limit} />
              </div>
            )}

            {!isWithinLimit && isTeamActive && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  O limite mensal de demandas deste quadro foi atingido.
                </AlertDescription>
              </Alert>
            )}

            {canCreateWithService === false && serviceInfo && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limite mensal para o serviço selecionado atingido ({serviceInfo.currentCount}/{serviceInfo.monthly_limit}).
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Form */}
          <form id="create-demand-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Title - full width */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Implementar nova funcionalidade"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Row: Status + Priority + Due Date */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={statusId} onValueChange={setStatusId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses?.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="média">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Entrega</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Row: Service + Assignees */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Serviço {hasBoardServices ? "*" : ""}
                </Label>
                <ServiceSelector
                  teamId={selectedTeamId}
                  boardId={selectedBoardId}
                  value={serviceId}
                  onChange={handleServiceChange}
                  userRole={boardRole}
                />
                <p className="text-xs text-muted-foreground">
                  {hasBoardServices 
                    ? "Serviço obrigatório para esta demanda"
                    : "Selecione para calcular data de entrega"
                  }
                </p>
              </div>

              {canAssignResponsibles && (
                <div className="space-y-2">
                  <Label>Responsáveis</Label>
                  <AssigneeSelector
                    teamId={selectedTeamId}
                    boardId={selectedBoardId}
                    selectedUserIds={assigneeIds}
                    onChange={setAssigneeIds}
                  />
                </div>
              )}
            </div>

            {/* Description - full width */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Descreva os detalhes da demanda... (cole imagens diretamente)"
                minHeight="120px"
              />
            </div>

            {/* Row: Attachments + Recurrence */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Anexos</Label>
                <InlineFileUploader
                  pendingFiles={pendingFiles}
                  onFilesChange={setPendingFiles}
                  disabled={isOffline}
                  listenToGlobalPaste={!isOffline}
                />
                {isOffline && (
                  <p className="text-xs text-muted-foreground">
                    Anexos não podem ser adicionados offline
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Recorrência</Label>
                <RecurrenceConfig value={recurrence} onChange={setRecurrence} />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-3 bg-card">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-demand-form"
            disabled={isSubmitDisabled}
          >
            {createDemand.isPending ? "Criando..." : "Criar Demanda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
