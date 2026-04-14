import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ArrowLeft, GitBranch, Users } from "lucide-react";
import type { SubdemandInput } from "@/hooks/useSubdemands";

export interface SubdemandFormData extends SubdemandInput {
  tempId: string;
  dependsOnIndex?: number;
  assigneeIds?: string[];
}

interface StatusOption {
  id: string;
  name: string;
  color: string;
}

interface CreateSubdemandFormProps {
  onBack: () => void;
  onSave: (data: SubdemandFormData) => void;
  existingSubdemands: SubdemandFormData[];
  editingIndex?: number;
  editingData?: SubdemandFormData | null;
  parentServiceId?: string;
  parentServiceName?: string;
  statuses: StatusOption[];
  defaultStatusId: string;
  teamId: string | null;
  boardId: string | null;
}

export function CreateSubdemandForm({
  onBack,
  onSave,
  existingSubdemands,
  editingIndex,
  editingData,
  parentServiceId,
  parentServiceName,
  statuses,
  defaultStatusId,
  teamId,
  boardId,
}: CreateSubdemandFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("média");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dependsOnIndex, setDependsOnIndex] = useState<number | undefined>(undefined);

  const isEditing = editingData != null;

  useEffect(() => {
    if (editingData) {
      setTitle(editingData.title);
      setPriority(editingData.priority || "média");
      setDescription(editingData.description || "");
      setStatusId(editingData.status_id || defaultStatusId);
      setDueDate(editingData.due_date || "");
      setAssigneeIds(editingData.assigneeIds || []);
      setDependsOnIndex(editingData.dependsOnIndex);
    } else {
      setTitle("");
      setPriority("média");
      setDescription("");
      setStatusId(defaultStatusId);
      setDueDate("");
      setAssigneeIds([]);
      setDependsOnIndex(undefined);
    }
  }, [editingData, defaultStatusId]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      tempId: editingData?.tempId || crypto.randomUUID(),
      title: title.trim(),
      priority,
      description: description.trim() || undefined,
      status_id: statusId || undefined,
      service_id: parentServiceId || undefined,
      due_date: dueDate || undefined,
      assigned_to: assigneeIds[0] || undefined,
      assigneeIds,
      dependsOnIndex,
    });
  };

  const availableDeps = existingSubdemands
    .map((s, i) => ({ ...s, idx: i }))
    .filter(({ idx }) => idx !== editingIndex);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para demanda
        </button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#F28705]" />
          {isEditing ? "Editar Subdemanda" : "Nova Subdemanda"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados da subdemanda vinculada à demanda principal
        </p>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="sub-title">Título *</Label>
            <Input
              id="sub-title"
              placeholder="Ex: Criar layout da tela"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>

          {/* Service (read-only, inherited) + Assignees */}
          <div className="grid grid-cols-2 gap-3">
            {parentServiceName && (
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Input
                  value={parentServiceName}
                  disabled
                  className="h-8 text-muted-foreground"
                />
              </div>
            )}
            <div className={`space-y-2 ${!parentServiceName ? "col-span-2" : ""}`}>
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsáveis
              </Label>
              <AssigneeSelector
                teamId={teamId}
                boardId={boardId}
                selectedUserIds={assigneeIds}
                onChange={setAssigneeIds}
                hideIcon
              />
            </div>
          </div>

          {/* Status + Priority + Due Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
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
              <Label>Data de Entrega</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          {/* Dependency */}
          {existingSubdemands.length > 0 && (
            <div className="space-y-2">
              <Label>Depende de</Label>
              <Select
                value={dependsOnIndex !== undefined ? String(dependsOnIndex) : "none"}
                onValueChange={(v) => setDependsOnIndex(v === "none" ? undefined : Number(v))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {availableDeps.map(({ idx, title: t }) => (
                    <SelectItem key={idx} value={String(idx)}>
                      Sub {idx + 1}: {t || "(sem título)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Descreva os detalhes da subdemanda..."
              minHeight="100px"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-2 flex justify-end gap-3 bg-card">
        <Button type="button" variant="outline" onClick={onBack} size="sm">
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          size="sm"
          className="bg-[#F28705] hover:bg-[#F28705]/90 text-white"
        >
          {isEditing ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
