import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandStatuses, useUpdateDemand } from "@/hooks/useDemands";
import { ServiceSelector } from "@/components/ServiceSelector";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useTeamRole } from "@/hooks/useTeamRole";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useNavigationBlock } from "@/hooks/useNavigationBlock";
import { calculateBusinessDueDate, formatDueDateForInput, toDateOnly } from "@/lib/dateUtils";
import { RecurrenceConfig, RecurrenceData, defaultRecurrenceData } from "@/components/RecurrenceConfig";
import { useRecurringDemands, useCreateRecurringDemand, useUpdateRecurringDemand, useDeleteRecurringDemand } from "@/hooks/useRecurringDemands";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";

interface DemandEditFormProps {
  demand: {
    id: string;
    title: string;
    description: string | null;
    status_id: string;
    priority: string | null;
    due_date: string | null;
    service_id: string | null;
    team_id: string;
    board_id: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DemandEditForm({ demand, onClose, onSuccess }: DemandEditFormProps) {
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const { data: statuses } = useDemandStatuses();
  const { data: currentAssignees } = useDemandAssignees(demand.id);
  const { data: boardRole } = useBoardRole(demand.board_id);

  // Recurring demands
  const { data: recurringDemands } = useRecurringDemands(demand.board_id);
  const createRecurring = useCreateRecurringDemand();
  const updateRecurring = useUpdateRecurringDemand();
  const deleteRecurring = useDeleteRecurringDemand();

  const canAssignResponsibles = boardRole !== "requester";

  const [title, setTitle] = useState(demand.title);
  const [description, setDescription] = useState(demand.description || "");
  const [statusId, setStatusId] = useState(demand.status_id);
  const [priority, setPriority] = useState(demand.priority || "média");
  const [dueDate, setDueDate] = useState(
    toDateOnly(demand.due_date) || ""
  );
  const [serviceId, setServiceId] = useState(demand.service_id || "");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceData>(defaultRecurrenceData);
  const [matchedRecurringId, setMatchedRecurringId] = useState<string | null>(null);

  useEffect(() => {
    if (currentAssignees) {
      setSelectedAssignees(currentAssignees.map(a => a.user_id));
    }
  }, [currentAssignees]);

  // Load existing recurring demand that matches this demand
  useEffect(() => {
    if (recurringDemands && (recurringDemands as any[]).length > 0) {
      const items = recurringDemands as any[];
      const match = items.find(
        (rd) => rd.title === demand.title && rd.board_id === demand.board_id
      );
      if (match) {
        setMatchedRecurringId(match.id);
        setRecurrence({
          enabled: true,
          frequency: match.frequency as RecurrenceData["frequency"],
          weekdays: match.weekdays || [1, 2, 3, 4, 5],
          dayOfMonth: match.day_of_month || 1,
          startDate: match.start_date || new Date().toISOString().split("T")[0],
          endDate: match.end_date || "",
        });
      }
    }
  }, [recurringDemands, demand.title, demand.board_id]);

  // Draft persistence
  const draftFields = useMemo(
    () => ({
      title,
      description,
      statusId,
      priority,
      dueDate,
      serviceId,
      selectedAssignees,
    }),
    [title, description, statusId, priority, dueDate, serviceId, selectedAssignees]
  );

  const draftSetters = useMemo(
    () => ({
      title: setTitle,
      description: setDescription,
      statusId: setStatusId,
      priority: setPriority,
      dueDate: setDueDate,
      serviceId: setServiceId,
      selectedAssignees: setSelectedAssignees,
    }),
    []
  );

  const { hasContent, clearDraft } = useFormDraft({
    formId: `edit-demand-${demand.id}`,
    fields: draftFields,
    setters: draftSetters,
  });

  // Navigation blocking (for edit form, we only use beforeunload)
  const {
    isBlocked,
    confirmNavigation,
    cancelNavigation,
    setDontShowAgain,
  } = useNavigationBlock({
    shouldBlock: hasContent(),
  });

  const handleServiceChange = (newServiceId: string, estimatedHours?: number) => {
    setServiceId(newServiceId);
    if (newServiceId !== "none" && estimatedHours) {
      const calculatedDate = calculateBusinessDueDate(estimatedHours);
      setDueDate(formatDueDateForInput(calculatedDate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !statusId) return;

    try {
      await updateDemand.mutateAsync({
        id: demand.id,
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        priority,
        due_date: dueDate || null,
        service_id: serviceId && serviceId !== "none" ? serviceId : null,
      });

      await setAssignees.mutateAsync({
        demandId: demand.id,
        userIds: selectedAssignees,
      });

      // Handle recurrence
      await handleRecurrence();

      // Clear draft on success
      clearDraft();

      toast.success("Demanda atualizada com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao atualizar demanda", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleRecurrence = async () => {
    try {
      if (recurrence.enabled) {
        const recurrencePayload = {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          frequency: recurrence.frequency,
          weekdays: (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") ? recurrence.weekdays : [],
          day_of_month: recurrence.frequency === "monthly" ? recurrence.dayOfMonth : null,
          start_date: recurrence.startDate,
          end_date: recurrence.endDate || null,
        };

        if (matchedRecurringId) {
          // Update existing recurring demand
          await updateRecurring.mutateAsync({
            id: matchedRecurringId,
            ...recurrencePayload,
          });
        } else {
          // Create new recurring demand
          await createRecurring.mutateAsync({
            team_id: demand.team_id,
            board_id: demand.board_id,
            status_id: statusId,
            service_id: serviceId && serviceId !== "none" ? serviceId : null,
            assignee_ids: selectedAssignees,
            ...recurrencePayload,
          });
        }
      } else if (matchedRecurringId) {
        // Recurrence was disabled - deactivate it
        await deleteRecurring.mutateAsync(matchedRecurringId);
        setMatchedRecurringId(null);
      }
    } catch (recError) {
      console.error("Erro ao salvar recorrência:", recError);
      toast.warning("Demanda atualizada, mas houve um erro ao salvar a recorrência");
    }
  };

  const isSaving = updateDemand.isPending || setAssignees.isPending || createRecurring.isPending || updateRecurring.isPending || deleteRecurring.isPending;

  return (
    <>
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        onDontShowAgain={setDontShowAgain}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Título *</Label>
          <Input
            id="edit-title"
            placeholder="Ex: Implementar nova funcionalidade"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Descrição</Label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Descreva os detalhes da demanda... (cole imagens diretamente no editor)"
            minHeight="120px"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status *</Label>
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
            <Label htmlFor="edit-priority">Prioridade</Label>
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
          <Label>Serviço</Label>
          <ServiceSelector
            teamId={demand.team_id}
            boardId={demand.board_id}
            value={serviceId}
            onChange={handleServiceChange}
          />
        </div>

        {canAssignResponsibles && (
          <div className="space-y-2">
            <Label>Responsáveis</Label>
            <AssigneeSelector
              teamId={demand.team_id}
              boardId={demand.board_id}
              selectedUserIds={selectedAssignees}
              onChange={setSelectedAssignees}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="edit-dueDate">Data de Vencimento</Label>
          <Input
            id="edit-dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Recurrence Config */}
        <RecurrenceConfig value={recurrence} onChange={setRecurrence} compact />

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 sticky bottom-0 bg-background pb-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !title.trim() || !statusId}
            className="flex-1"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </>
  );
}
