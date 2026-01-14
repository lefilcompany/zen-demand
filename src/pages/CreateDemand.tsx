import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useCanCreateDemandOnBoard } from "@/hooks/useBoardScope";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useHasBoardServices, useCanCreateWithService } from "@/hooks/useBoardServices";
import { ServiceSelector } from "@/components/ServiceSelector";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ScopeProgressBar } from "@/components/ScopeProgressBar";
import { InlineFileUploader, PendingFile, uploadPendingFiles } from "@/components/InlineFileUploader";
import { useUploadAttachment } from "@/hooks/useAttachments";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useNavigationBlock } from "@/hooks/useNavigationBlock";
import { ArrowLeft, AlertTriangle, Ban, CloudOff, WifiOff, Package } from "lucide-react";
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
  
  // Board services hooks
  const { hasBoardServices, isLoading: boardServicesLoading } = useHasBoardServices(selectedBoardId);

  const selectedTeam = teams?.find(t => t.id === selectedTeamId);
  const canAssignResponsibles = role !== "requester";

  // Redirect requesters to the request page
  if (role === "requester") {
    return <Navigate to="/demands/request" replace />;
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priority, setPriority] = useState("média");
  const [dueDate, setDueDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  
  const uploadAttachment = useUploadAttachment();

  // Draft persistence
  const draftFields = useMemo(
    () => ({
      title,
      description,
      priority,
      dueDate,
      serviceId,
      assigneeIds,
    }),
    [title, description, priority, dueDate, serviceId, assigneeIds]
  );

  const draftSetters = useMemo(
    () => ({
      title: setTitle,
      description: setDescription,
      priority: setPriority,
      dueDate: setDueDate,
      serviceId: setServiceId,
      assigneeIds: setAssigneeIds,
    }),
    []
  );

  const { hasContent, clearDraft } = useFormDraft({
    formId: `create-demand-${selectedBoardId || "default"}`,
    fields: draftFields,
    setters: draftSetters,
  });

  // Navigation blocking
  const {
    isBlocked,
    confirmNavigation,
    cancelNavigation,
    setDontShowAgain,
  } = useNavigationBlock({
    shouldBlock: hasContent(),
  });

  // Check if can create with selected service
  const { canCreate: canCreateWithService, serviceInfo } = useCanCreateWithService(
    selectedBoardId, 
    serviceId && serviceId !== "none" ? serviceId : null
  );

  // Set default status when statuses load
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

  // Validate service selection
  const isServiceValid = () => {
    if (!hasBoardServices) return true; // No board services configured, service is optional
    if (!serviceId || serviceId === "none") return false; // Service required but not selected
    if (canCreateWithService === false) return false; // Service limit reached
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTeamId || !selectedBoardId || !statusId || !canCreate) return;

    // Validate service for boards with configured services
    if (hasBoardServices && (!serviceId || serviceId === "none")) {
      toast.error("Selecione um serviço para esta demanda");
      return;
    }

    if (canCreateWithService === false) {
      toast.error("Limite mensal deste serviço foi atingido");
      return;
    }

    createDemand.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        team_id: selectedTeamId,
        board_id: selectedBoardId,
        status_id: statusId,
        priority,
        due_date: dueDate || undefined,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
      },
      {
        onSuccess: async (demand) => {
          // Clear draft on success
          clearDraft();
          
          // Check if this was created offline
          const wasCreatedOffline = (demand as any)?._isOffline;
          
          // Add assignees if any (only if online - offline demands can't have assignees yet)
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
              toast.warning("Demanda criada, mas houve um erro ao atribuir responsáveis", {
                description: "Você pode atribuir responsáveis na tela de detalhes.",
              });
            }
          }
          
          // Upload pending files
          if (!wasCreatedOffline && pendingFiles.length > 0 && demand) {
            const { success, failed } = await uploadPendingFiles(demand.id, pendingFiles, uploadAttachment);
            if (failed > 0) {
              toast.warning(`${success} arquivo(s) enviado(s), ${failed} falhou(ram)`);
            } else if (success > 0) {
              toast.success(`${success} arquivo(s) anexado(s)`);
            }
            setPendingFiles([]);
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
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-1">
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        onDontShowAgain={setDontShowAgain}
      />

      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/demands")}
          className="mb-2 md:mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Nova Demanda</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Criar demanda para o quadro <span className="font-medium text-primary">{currentBoard?.name}</span>
        </p>
      </div>

      {/* Offline Mode Alert */}
      {isOffline && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Você está offline. A demanda será salva localmente e sincronizada quando a conexão for restaurada.
          </AlertDescription>
        </Alert>
      )}

      {/* Team Inactive Alert */}
      {!isTeamActive && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertDescription>
            O contrato desta equipe está inativo. Não é possível criar novas demandas.
          </AlertDescription>
        </Alert>
      )}

      {/* Board Limit Progress */}
      {hasBoardLimit && isTeamActive && (
        <Card>
          <CardContent className="pt-6">
            <ScopeProgressBar used={monthlyCount} limit={limit} />
          </CardContent>
        </Card>
      )}

      {/* Board Limit Reached Alert */}
      {!isWithinLimit && isTeamActive && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O limite mensal de demandas deste quadro foi atingido. Entre em contato com o administrador para mais informações.
          </AlertDescription>
        </Alert>
      )}

      {/* Service Limit Reached Alert */}
      {canCreateWithService === false && serviceInfo && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O limite mensal para o serviço selecionado foi atingido ({serviceInfo.currentCount}/{serviceInfo.monthly_limit}).
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações da Demanda</CardTitle>
          <CardDescription>
            Preencha os dados para criar uma nova demanda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Implementar nova funcionalidade"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Descreva os detalhes da demanda... (cole imagens diretamente no editor)"
                minHeight="150px"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={statusId} onValueChange={setStatusId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um status" />
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
            </div>

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
              />
              <p className="text-xs text-muted-foreground">
                {hasBoardServices 
                  ? "Selecione um serviço obrigatório para esta demanda"
                  : "Selecione um serviço para calcular automaticamente a data de entrega"
                }
              </p>
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

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/demands")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="flex-1"
              >
                {createDemand.isPending ? "Criando..." : "Criar Demanda"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
