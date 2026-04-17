import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandStatuses, useUpdateDemand } from "@/hooks/useDemands";
import { ServiceSelector } from "@/components/ServiceSelector";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useBoardStatuses } from "@/hooks/useBoardStatuses";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useNavigationBlock } from "@/hooks/useNavigationBlock";
import { calculateBusinessDueDate, formatDueDateForInput, toDateOnly } from "@/lib/dateUtils";
import { RecurrenceConfig, RecurrenceData, defaultRecurrenceData } from "@/components/RecurrenceConfig";
import { useRecurringDemands, useCreateRecurringDemand, useUpdateRecurringDemand, useDeleteRecurringDemand } from "@/hooks/useRecurringDemands";
import { useAddSubdemand } from "@/hooks/useSubdemands";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { GitBranch, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { StepProgress, SubdemandStepForm } from "@/components/create-demand";
import type { SubdemandFormData } from "@/components/create-demand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
  const { user } = useAuth();
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const { data: statuses } = useDemandStatuses();
  const { data: boardStatuses } = useBoardStatuses(demand.board_id);
  const { data: currentAssignees } = useDemandAssignees(demand.id);
  const { data: boardRole } = useBoardRole(demand.board_id);

  // Recurring demands
  const { data: recurringDemands } = useRecurringDemands(demand.board_id);
  const createRecurring = useCreateRecurringDemand();
  const updateRecurring = useUpdateRecurringDemand();
  const deleteRecurring = useDeleteRecurringDemand();
  const addSubdemand = useAddSubdemand();

  const canAssignResponsibles = boardRole !== "requester";

  // Parent state
  const [title, setTitle] = useState(demand.title);
  const [description, setDescription] = useState(demand.description || "");
  const [statusId, setStatusId] = useState(demand.status_id);
  const [priority, setPriority] = useState(demand.priority || "média");
  const [dueDate, setDueDate] = useState(toDateOnly(demand.due_date) || "");
  const [serviceId, setServiceId] = useState(demand.service_id || "");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceData>(defaultRecurrenceData);
  const [matchedRecurringId, setMatchedRecurringId] = useState<string | null>(null);

  // Subdemand state — only NEW subdemands to be added
  const [newSubdemands, setNewSubdemands] = useState<SubdemandFormData[]>([]);

  // Step state: 0 = parent, 1..N = subdemand forms
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);

  const totalSteps = 1 + newSubdemands.length;

  // Derive status options from board statuses (filtered properly)
  const statusOptions = useMemo(() => {
    if (boardStatuses && boardStatuses.length > 0) {
      return boardStatuses.map((bs) => ({
        id: bs.status.id,
        name: bs.status.name,
        color: bs.status.color,
      }));
    }
    return statuses || [];
  }, [boardStatuses, statuses]);

  const defaultSubStatusId = useMemo(() => {
    const initial = statusOptions.find((s) => s.name === "A Iniciar");
    return initial?.id || statusOptions[0]?.id || statusId;
  }, [statusOptions, statusId]);

  useEffect(() => {
    if (currentAssignees) {
      setSelectedAssignees(currentAssignees.map((a) => a.user_id));
    }
  }, [currentAssignees]);

  // Load existing recurring demand
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
    () => ({ title, description, statusId, priority, dueDate, serviceId, selectedAssignees }),
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

  const { isBlocked, confirmNavigation, cancelNavigation, setDontShowAgain } = useNavigationBlock({
    shouldBlock: hasContent(),
  });

  const handleServiceChange = (newServiceId: string, estimatedHours?: number) => {
    setServiceId(newServiceId);
    if (newServiceId !== "none" && estimatedHours) {
      const calculatedDate = calculateBusinessDueDate(estimatedHours);
      setDueDate(formatDueDateForInput(calculatedDate));
    }
  };

  // Subdemand handlers
  const handleAddSubdemandSlot = () => {
    setNewSubdemands((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        title: "",
        priority: "média",
        status_id: defaultSubStatusId,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
        assigneeIds: [],
      },
    ]);
    // Jump to that step
    setTimeout(() => {
      const newStepIdx = newSubdemands.length + 1;
      setCurrentStep(newStepIdx);
      setMaxVisitedStep((prev) => Math.max(prev, newStepIdx));
    }, 0);
  };

  const handleSubdemandChange = (index: number, data: SubdemandFormData) => {
    setNewSubdemands((prev) => prev.map((s, i) => (i === index ? data : s)));
  };

  const handleRemoveSubdemand = (index: number) => {
    setNewSubdemands((prev) => prev.filter((_, i) => i !== index));
    // Adjust step
    if (currentStep > newSubdemands.length) {
      setCurrentStep(Math.max(0, currentStep - 1));
    }
  };

  // Saved steps tracking (for StepProgress visual)
  const savedSteps = useMemo(() => {
    const set = new Set<number>();
    if (title.trim() && statusId && priority && dueDate) set.add(0);
    newSubdemands.forEach((s, idx) => {
      if (s.title.trim() && s.priority && s.due_date && (s.assigneeIds?.length || 0) > 0) {
        set.add(idx + 1);
      }
    });
    return set;
  }, [title, statusId, priority, dueDate, newSubdemands]);

  const stepTitles = useMemo(() => {
    const map: Record<number, string> = {};
    if (title.trim()) map[0] = title.trim();
    newSubdemands.forEach((s, idx) => {
      if (s.title.trim()) map[idx + 1] = s.title.trim();
    });
    return map;
  }, [title, newSubdemands]);

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxVisitedStep((prev) => Math.max(prev, next));
    }
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !statusId) return;

    if (!priority) {
      toast.error("Defina a prioridade da demanda");
      return;
    }
    if (!dueDate) {
      toast.error("A data de entrega é obrigatória");
      return;
    }
    if (canAssignResponsibles && selectedAssignees.length === 0) {
      toast.error("Selecione pelo menos um responsável");
      return;
    }

    // Validate subdemands
    const validSubs = newSubdemands.filter((s) => s.title.trim());
    for (let i = 0; i < validSubs.length; i++) {
      const s = validSubs[i];
      if (!s.assigneeIds || s.assigneeIds.length === 0) {
        toast.error(`Subdemanda ${i + 1}: selecione pelo menos um responsável`);
        setCurrentStep(newSubdemands.indexOf(s) + 1);
        return;
      }
      if (!s.priority) {
        toast.error(`Subdemanda ${i + 1}: defina a prioridade`);
        return;
      }
      if (!s.due_date) {
        toast.error(`Subdemanda ${i + 1}: defina a data de entrega`);
        return;
      }
    }

    try {
      await updateDemand.mutateAsync({
        id: demand.id,
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        priority,
        due_date: dueDate,
        service_id: serviceId && serviceId !== "none" ? serviceId : null,
      });

      await setAssignees.mutateAsync({
        demandId: demand.id,
        userIds: selectedAssignees,
      });

      // Add new subdemands
      const parentAssigneeSet = new Set(selectedAssignees);
      for (const sub of validSubs) {
        const created = await addSubdemand.mutateAsync({
          parentDemandId: demand.id,
          title: sub.title.trim(),
          teamId: demand.team_id,
          boardId: demand.board_id,
          statusId: sub.status_id || defaultSubStatusId,
          priority: sub.priority || "média",
          description: sub.description,
          dueDate: sub.due_date,
          serviceId: sub.service_id,
        });
        // Sanitize and assign
        const sanitized = (sub.assigneeIds || []).filter((id) => parentAssigneeSet.has(id));
        if (created && sanitized.length > 0) {
          await supabase
            .from("demand_assignees")
            .insert(sanitized.map((userId) => ({ demand_id: (created as any).id, user_id: userId })));
        }
      }

      await handleRecurrence();
      clearDraft();

      const subMsg = validSubs.length > 0 ? ` e ${validSubs.length} subdemanda(s) criada(s)` : "";
      toast.success(`Demanda atualizada${subMsg}!`);
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
          weekdays: recurrence.frequency === "weekly" || recurrence.frequency === "biweekly" ? recurrence.weekdays : [],
          day_of_month: recurrence.frequency === "monthly" ? recurrence.dayOfMonth : null,
          start_date: recurrence.startDate,
          end_date: recurrence.endDate || null,
        };

        if (matchedRecurringId) {
          await updateRecurring.mutateAsync({ id: matchedRecurringId, ...recurrencePayload });
        } else {
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
        await deleteRecurring.mutateAsync(matchedRecurringId);
        setMatchedRecurringId(null);
      }
    } catch (recError) {
      console.error("Erro ao salvar recorrência:", recError);
      toast.warning("Demanda atualizada, mas houve um erro ao salvar a recorrência");
    }
  };

  const isSaving =
    updateDemand.isPending ||
    setAssignees.isPending ||
    createRecurring.isPending ||
    updateRecurring.isPending ||
    deleteRecurring.isPending ||
    addSubdemand.isPending;

  const isParentValid = !!title.trim() && !!statusId && !!priority && !!dueDate && (!canAssignResponsibles || selectedAssignees.length > 0);
  const isOnSubdemandStep = currentStep > 0 && currentStep <= newSubdemands.length;
  const currentSubIndex = isOnSubdemandStep ? currentStep - 1 : -1;

  return (
    <>
      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        onDontShowAgain={setDontShowAgain}
      />

      {/* Step navigation header */}
      <div className="border-b pb-3 mb-4 -mt-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <StepProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            subdemandCount={newSubdemands.length}
            stepTitles={stepTitles}
            savedSteps={savedSteps}
            maxVisitedStep={maxVisitedStep}
            onStepClick={(idx) => setCurrentStep(idx)}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddSubdemandSlot}
            disabled={!isParentValid}
            className="h-8 gap-1.5 bg-[#F28705] hover:bg-[#F28705]/90 text-white shadow-sm shrink-0"
            title={!isParentValid ? "Preencha os campos obrigatórios da demanda" : "Adicionar subdemanda"}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Subdemanda</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* STEP 0 — Parent demand */}
        {currentStep === 0 && (
          <>
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
                placeholder="Descreva os detalhes da demanda..."
                minHeight="180px"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select value={statusId} onValueChange={setStatusId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions?.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority">Prioridade *</Label>
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
                <Label htmlFor="edit-dueDate">Data de Vencimento *</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label>Responsáveis *</Label>
                  <AssigneeSelector
                    teamId={demand.team_id}
                    boardId={demand.board_id}
                    selectedUserIds={selectedAssignees}
                    onChange={setSelectedAssignees}
                  />
                </div>
              )}
            </div>

            <RecurrenceConfig value={recurrence} onChange={setRecurrence} compact />
          </>
        )}

        {/* STEP N — Subdemand form */}
        {isOnSubdemandStep && newSubdemands[currentSubIndex] && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 bg-[#F28705]/5 border border-[#F28705]/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[#F28705]" />
                <span className="text-sm font-semibold">Nova Subdemanda {currentSubIndex + 1}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSubdemand(currentSubIndex)}
                className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            </div>
            <SubdemandStepForm
              index={currentSubIndex}
              data={newSubdemands[currentSubIndex]}
              onChange={(d) => handleSubdemandChange(currentSubIndex, d)}
              allSubdemands={newSubdemands}
              statuses={statusOptions}
              defaultStatusId={defaultSubStatusId}
              teamId={demand.team_id}
              boardId={demand.board_id}
              parentServiceId={serviceId && serviceId !== "none" ? serviceId : undefined}
              parentAssigneeIds={selectedAssignees}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 sticky bottom-0 bg-background pb-1 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
            Cancelar
          </Button>

          <div className="flex-1 flex gap-2">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={goPrev} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}

            {currentStep < totalSteps - 1 && (
              <Button type="button" variant="outline" onClick={goNext} className="gap-1 ml-auto">
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSaving || !isParentValid}
              className="flex-1 bg-[#F28705] hover:bg-[#F28705]/90 text-white"
            >
              {isSaving ? "Salvando..." : newSubdemands.length > 0 ? `Salvar + ${newSubdemands.length} subdemanda(s)` : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
