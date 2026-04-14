import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateDemand } from "@/hooks/useDemands";
import { useBoardStatuses } from "@/hooks/useBoardStatuses";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useCanCreateDemandOnBoard } from "@/hooks/useBoardScope";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useHasBoardServices, useCanCreateWithService } from "@/hooks/useBoardServices";
import { useBoards } from "@/hooks/useBoards";
import { useDemandFolders, useAddDemandToFolder } from "@/hooks/useDemandFolders";
import { ServiceSelector } from "@/components/ServiceSelector";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ScopeProgressBar } from "@/components/ScopeProgressBar";
import { InlineFileUploader, PendingFile, uploadPendingFiles } from "@/components/InlineFileUploader";
import { useUploadAttachment } from "@/hooks/useAttachments";
import { RecurrenceConfig, RecurrenceData, defaultRecurrenceData } from "@/components/RecurrenceConfig";
import { useCreateRecurringDemand } from "@/hooks/useRecurringDemands";
import { useCreateDemandWithSubdemands, SubdemandInput, DependencyInput } from "@/hooks/useSubdemands";
import { AlertTriangle, Ban, CloudOff, WifiOff, Package, CheckCircle2, Plus, ExternalLink, LayoutGrid, FolderOpen, Users, X, GitBranch, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useCreateDemandModal } from "@/contexts/CreateDemandContext";
import { calculateBusinessDueDate, formatDueDateForInput } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CreateDemand({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOpen: contextOpen, closeCreateDemand } = useCreateDemandModal();
  
  const isOpen = open ?? contextOpen;
  const handleClose = () => {
    onClose?.();
    closeCreateDemand();
    setSuccessState(null);
  };
  
  const { isOffline } = useOfflineStatus();
  const createDemand = useCreateDemand();
  const addDemandToFolder = useAddDemandToFolder();
  const { selectedTeamId, teams } = useSelectedTeam();
  const { selectedBoardId, setSelectedBoardId, boards: contextBoards } = useSelectedBoardSafe();
  const { data: allBoards } = useBoards(selectedTeamId);
  const { data: allFolders } = useDemandFolders(selectedTeamId, user?.id);

  // Local board selection for this form (defaults to current board)
  const [formBoardId, setFormBoardId] = useState<string>("");

  const { data: boardStatuses } = useBoardStatuses(formBoardId || null);
  
  // Derive statuses from board-specific statuses
  const statuses = useMemo(() => {
    if (!boardStatuses) return [];
    return boardStatuses.map(bs => ({
      id: bs.status.id,
      name: bs.status.name,
      color: bs.status.color,
    }));
  }, [boardStatuses]);
  
  // Success state: holds info about the created demand
  const [successState, setSuccessState] = useState<{
    demandId: string;
    demandTitle: string;
    boardId: string;
    boardName: string;
  } | null>(null);

  const activeBoardId = formBoardId || selectedBoardId;

  const { 
    canCreate, 
    isTeamActive, 
    isWithinLimit, 
    hasBoardLimit, 
    monthlyCount, 
    limit 
  } = useCanCreateDemandOnBoard(activeBoardId, selectedTeamId);
  const { data: role } = useTeamRole(selectedTeamId);
  const { data: boardRole } = useBoardRole(activeBoardId);
  const { hasBoardServices } = useHasBoardServices(activeBoardId);

  const canAssignResponsibles = boardRole !== "requester";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priority, setPriority] = useState("média");
  const [dueDate, setDueDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceData>(defaultRecurrenceData);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [subdemands, setSubdemands] = useState<(SubdemandInput & { tempId: string; dependsOnIndex?: number })[]>([]);
  const uploadAttachment = useUploadAttachment();
  const createRecurringDemand = useCreateRecurringDemand();
  const createDemandWithSubdemands = useCreateDemandWithSubdemands();

  const { canCreate: canCreateWithService, serviceInfo } = useCanCreateWithService(
    activeBoardId, 
    serviceId && serviceId !== "none" ? serviceId : null
  );

  // Folders the user owns or has edit permission on
  const editableFolders = useMemo(() => {
    if (!allFolders || !user?.id) return [];
    return allFolders.filter((f) => {
      if (f.is_owner) return true;
      const share = f.shared_with?.find((s) => s.user_id === user.id);
      return share?.permission === "edit";
    });
  }, [allFolders, user?.id]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setSuccessState(null);
    }
  }, [isOpen]);

  // Set default board when modal opens
  useEffect(() => {
    if (isOpen && selectedBoardId && !formBoardId) {
      setFormBoardId(selectedBoardId);
    }
  }, [isOpen, selectedBoardId]);

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

  // When requester opens the create demand modal, close it
  useEffect(() => {
    if (boardRole === "requester" && isOpen) {
      onClose?.();
      closeCreateDemand();
    }
  }, [boardRole, isOpen, onClose, closeCreateDemand]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatusId("");
    setPriority("média");
    setDueDate("");
    setServiceId("");
    setAssigneeIds([]);
    setPendingFiles([]);
    setRecurrence(defaultRecurrenceData);
    setSelectedFolderId("");
    setSubdemands([]);
  };

  const isServiceValid = () => {
    if (!serviceId || serviceId === "none") return false;
    if (canCreateWithService === false) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTeamId || !activeBoardId || !statusId || !canCreate) return;

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

    const selectedBoard = allBoards?.find(b => b.id === activeBoardId);

    // If there are subdemands, use transactional RPC
    if (subdemands.length > 0) {
      const parentData = {
        title: title.trim(),
        description: finalDescription,
        team_id: selectedTeamId,
        board_id: activeBoardId,
        status_id: statusId,
        priority,
        due_date: dueDate || undefined,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
      };

      const subInputs: SubdemandInput[] = subdemands.map(s => ({
        title: s.title,
        priority: s.priority || "média",
        status_id: s.status_id || statusId,
      }));

      const deps: DependencyInput[] = subdemands
        .map((s, idx) => {
          if (s.dependsOnIndex !== undefined && s.dependsOnIndex >= 0) {
            return { demand_index: idx + 1, depends_on_index: s.dependsOnIndex + 1 };
          }
          return null;
        })
        .filter(Boolean) as DependencyInput[];

      createDemandWithSubdemands.mutate(
        { parent: parentData, subdemands: subInputs, dependencies: deps },
        {
          onSuccess: async (result) => {
            const parentId = result.parent_id;

            // Handle assignees for parent
            if (assigneeIds.length > 0 && parentId) {
              await supabase
                .from("demand_assignees")
                .insert(assigneeIds.map((userId) => ({ demand_id: parentId, user_id: userId })));
            }

            // Handle files for parent
            if (pendingFiles.length > 0 && parentId) {
              const { success, failed } = await uploadPendingFiles(parentId, pendingFiles, uploadAttachment);
              if (failed > 0) toast.warning(`${success} arquivo(s) enviado(s), ${failed} falhou(ram)`);
              else if (success > 0) toast.success(`${success} arquivo(s) anexado(s)`);
              setPendingFiles([]);
            }

            // Handle folder
            if (selectedFolderId && parentId) {
              try {
                await addDemandToFolder.mutateAsync({ folder_id: selectedFolderId, demand_id: parentId });
              } catch {}
            }

            setSuccessState({
              demandId: parentId,
              demandTitle: title.trim(),
              boardId: activeBoardId,
              boardName: selectedBoard?.name || "Quadro",
            });
            resetForm();
            if (statuses && statuses.length > 0) {
              const defaultStatus = statuses.find(s => s.name === "A Iniciar") || statuses[0];
              setStatusId(defaultStatus.id);
            }
          },
          onError: (error: any) => {
            toast.error("Erro ao criar demanda com subdemandas", {
              description: getErrorMessage(error),
            });
          },
        }
      );
      return;
    }

    // No subdemands — original flow
    createDemand.mutate(
      {
        title: title.trim(),
        description: finalDescription,
        team_id: selectedTeamId,
        board_id: activeBoardId,
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
          
          if (!wasCreatedOffline && recurrence.enabled && demand && selectedTeamId && activeBoardId) {
            try {
              await createRecurringDemand.mutateAsync({
                team_id: selectedTeamId,
                board_id: activeBoardId,
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

          // Add to folder if selected
          if (!wasCreatedOffline && selectedFolderId && demand) {
            try {
              await addDemandToFolder.mutateAsync({ folder_id: selectedFolderId, demand_id: demand.id });
            } catch (folderError) {
              console.error("Erro ao adicionar à pasta:", folderError);
              toast.warning("Demanda criada, mas houve um erro ao adicionar à pasta");
            }
          }

          // Show success state instead of closing
          setSuccessState({
            demandId: demand?.id || "",
            demandTitle: title.trim(),
            boardId: activeBoardId,
            boardName: selectedBoard?.name || "Quadro",
          });
          
          // Reset form for potential new creation
          resetForm();
          // Re-set default status
          if (statuses && statuses.length > 0) {
            const defaultStatus = statuses.find(s => s.name === "A Iniciar") || statuses[0];
            setStatusId(defaultStatus.id);
          }
        },
        onError: (error: any) => {
          toast.error("Erro ao criar demanda", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleCreateAnother = () => {
    setSuccessState(null);
  };

  const handleGoToBoard = () => {
    if (successState) {
      // Switch to the board where the demand was created
      setSelectedBoardId(successState.boardId);
      handleClose();
      navigate("/demands");
    }
  };

  const isSubmitDisabled = (createDemand.isPending || createDemandWithSubdemands.isPending) || 
    !title.trim() || 
    !statusId || 
    !activeBoardId || 
    canCreate === false || 
    !isServiceValid();

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {successState ? (
          // Success state
          <>
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Demanda criada com sucesso!</h2>
                <p className="text-muted-foreground max-w-md">
                  A demanda <span className="font-medium text-foreground">"{successState.demandTitle}"</span> foi criada no quadro{" "}
                  <span className="font-medium text-primary">{successState.boardName}</span>.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleCreateAnother}
                >
                  <Plus className="h-4 w-4" />
                  Criar Nova
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => {
                    if (successState?.demandId) {
                      handleClose();
                      navigate(`/demands/${successState.demandId}`);
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Ir para a Demanda
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleGoToBoard}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Ir para o Quadro
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Form state
          <>
            <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
              <DialogTitle className="text-xl font-bold">Nova Demanda</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Selecione o quadro e preencha os dados da demanda
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
              <form id="create-demand-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Board Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Quadro *
                  </Label>
                  <Select value={formBoardId} onValueChange={(val) => {
                    setFormBoardId(val);
                    // Reset dependent fields when board changes
                    setServiceId("");
                    setAssigneeIds([]);
                    setStatusId("");
                  }}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione o quadro" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBoards?.map((board) => (
                        <SelectItem key={board.id} value={board.id}>
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                            {board.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                    disabled={!formBoardId}
                    className="h-8"
                  />
                </div>

                {/* Row: Service + Assignees + Folder */}
                <div className={`grid gap-4 grid-cols-1 ${editableFolders.length > 0 && canAssignResponsibles ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Serviço {hasBoardServices ? "*" : ""}
                    </Label>
                    <ServiceSelector
                      teamId={selectedTeamId}
                      boardId={activeBoardId}
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
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Responsáveis
                      </Label>
                      <AssigneeSelector
                        teamId={selectedTeamId}
                        boardId={activeBoardId}
                        selectedUserIds={assigneeIds}
                        onChange={setAssigneeIds}
                        hideIcon
                      />
                    </div>
                  )}

                  {editableFolders.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Pasta
                      </Label>
                      <Select value={selectedFolderId || "none"} onValueChange={(v) => setSelectedFolderId(v === "none" ? "" : v)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Nenhuma pasta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma pasta</SelectItem>
                          {editableFolders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color }} />
                                <span className="truncate">{folder.name}</span>
                                {!folder.is_owner && (
                                  <span className="text-[10px] text-muted-foreground ml-1">(compartilhada)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Row: Status + Priority + Due Date */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select value={statusId} onValueChange={setStatusId} required disabled={!formBoardId}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={!formBoardId ? "Selecione o quadro primeiro" : "Selecione"} />
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
                      <SelectTrigger className="h-8">
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
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Subdemands Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Subdemandas
                  </Label>

                  <div className="space-y-2">
                    {subdemands.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {subdemands.map((sub, idx) => (
                          <div
                            key={sub.tempId}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#F28705] text-white px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#F28705]/90 transition-colors"
                            onClick={() => {
                              setEditingSubdemandIndex(idx);
                              setSubdemandDialogOpen(true);
                            }}
                          >
                            <span>{sub.title || `Subdemanda ${idx + 1}`}</span>
                            <Pencil className="h-3 w-3 opacity-80" />
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 border-dashed border-[#F28705] text-[#F28705] hover:bg-[#F28705]/10 hover:text-[#F28705] gap-1.5 text-xs rounded-lg"
                      onClick={() => {
                        setEditingSubdemandIndex(undefined);
                        setSubdemandDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>

                  <CreateSubdemandDialog
                    open={subdemandDialogOpen}
                    onClose={() => {
                      setSubdemandDialogOpen(false);
                      setEditingSubdemandIndex(undefined);
                    }}
                    onSave={(data) => {
                      if (editingSubdemandIndex !== undefined) {
                        setSubdemands(prev =>
                          prev.map((s, i) => i === editingSubdemandIndex ? { ...data, tempId: s.tempId } : s)
                        );
                      } else {
                        setSubdemands(prev => [...prev, data]);
                      }
                    }}
                    existingSubdemands={subdemands}
                    editingIndex={editingSubdemandIndex}
                    editingData={editingSubdemandIndex !== undefined ? subdemands[editingSubdemandIndex] : null}
                  />
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
                    <div className="flex items-center justify-between">
                      <Label>Anexos</Label>
                      {pendingFiles.length > 0 && (
                        <span className="text-xs text-muted-foreground">{pendingFiles.length} arquivo(s)</span>
                      )}
                    </div>
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
            <div className="shrink-0 px-6 py-2 flex justify-end gap-3 bg-card">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="create-demand-form"
                disabled={isSubmitDisabled}
                size="sm"
              >
                {(createDemand.isPending || createDemandWithSubdemands.isPending) ? "Criando..." : "Criar Demanda"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
