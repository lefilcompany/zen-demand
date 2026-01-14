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
import { calculateBusinessDueDate, formatDueDateForInput, toDateOnly } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
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
  const { data: role } = useTeamRole(demand.team_id);

  const canAssignResponsibles = role !== "requester";

  const [title, setTitle] = useState(demand.title);
  const [description, setDescription] = useState(demand.description || "");
  const [statusId, setStatusId] = useState(demand.status_id);
  const [priority, setPriority] = useState(demand.priority || "média");
  const [dueDate, setDueDate] = useState(
    toDateOnly(demand.due_date) || ""
  );
  const [serviceId, setServiceId] = useState(demand.service_id || "");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (currentAssignees) {
      setSelectedAssignees(currentAssignees.map(a => a.user_id));
    }
  }, [currentAssignees]);

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

      toast.success("Demanda atualizada com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao atualizar demanda", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
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
          demandId={demand.id}
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
          disabled={updateDemand.isPending || setAssignees.isPending || !title.trim() || !statusId}
          className="flex-1"
        >
          {updateDemand.isPending || setAssignees.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
