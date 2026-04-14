import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ArrowLeft, GitBranch, Users, X } from "lucide-react";
import type { SubdemandInput } from "@/hooks/useSubdemands";

export interface SubdemandFormData extends SubdemandInput {
  tempId: string;
  dependsOnIndex?: number;
  assigneeIds?: string[];
}

export interface SubdemandDraft {
  title: string;
  priority: string;
  description: string;
  statusId: string;
  dueDate: string;
  assigneeIds: string[];
  dependsOnIndex?: number;
}

export const emptyDraft: SubdemandDraft = {
  title: "",
  priority: "média",
  description: "",
  statusId: "",
  dueDate: "",
  assigneeIds: [],
  dependsOnIndex: undefined,
};

interface StatusOption {
  id: string;
  name: string;
  color: string;
}

interface CreateSubdemandFormProps {
  onBack: () => void;
  onSave: (data: SubdemandFormData) => void;
  onDelete?: () => void;
  existingSubdemands: SubdemandFormData[];
  editingIndex?: number;
  editingData?: SubdemandFormData | null;
  parentServiceId?: string;
  parentServiceName?: string;
  statuses: StatusOption[];
  defaultStatusId: string;
  teamId: string | null;
  boardId: string | null;
  draft: SubdemandDraft;
  onDraftChange: (draft: SubdemandDraft) => void;
}

export function CreateSubdemandForm({
  onBack,
  onSave,
  onDelete,
  existingSubdemands,
  editingIndex,
  editingData,
  parentServiceId,
  parentServiceName,
  statuses,
  defaultStatusId,
  teamId,
  boardId,
  draft,
  onDraftChange,
}: CreateSubdemandFormProps) {
  const isEditing = editingData != null;

  // Sync draft from editingData when editing starts
  useEffect(() => {
    if (editingData) {
      onDraftChange({
        title: editingData.title,
        priority: editingData.priority || "média",
        description: editingData.description || "",
        statusId: editingData.status_id || defaultStatusId,
        dueDate: editingData.due_date || "",
        assigneeIds: editingData.assigneeIds || [],
        dependsOnIndex: editingData.dependsOnIndex,
      });
    }
  }, [editingData?.tempId]);

  // Set default status if empty
  useEffect(() => {
    if (!draft.statusId && defaultStatusId) {
      onDraftChange({ ...draft, statusId: defaultStatusId });
    }
  }, [defaultStatusId]);

  const updateDraft = useCallback((partial: Partial<SubdemandDraft>) => {
    onDraftChange({ ...draft, ...partial });
  }, [draft, onDraftChange]);

  const handleSave = () => {
    if (!draft.title.trim()) return;
    onSave({
      tempId: editingData?.tempId || crypto.randomUUID(),
      title: draft.title.trim(),
      priority: draft.priority,
      description: draft.description.trim() || undefined,
      status_id: draft.statusId || undefined,
      service_id: parentServiceId || undefined,
      due_date: draft.dueDate || undefined,
      assigned_to: draft.assigneeIds[0] || undefined,
      assigneeIds: draft.assigneeIds,
      dependsOnIndex: draft.dependsOnIndex,
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-[#F28705]" />
              {isEditing ? "Editar Subdemanda" : "Nova Subdemanda"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Preencha os dados da subdemanda vinculada à demanda principal
            </p>
          </div>
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={onDelete}
            >
              <X className="h-4 w-4" />
              Remover
            </Button>
          )}
        </div>
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
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              className="h-8"
              autoFocus
            />
          </div>

          {/* Service (read-only, inherited) + Assignees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className={`space-y-2 ${!parentServiceName ? "sm:col-span-2" : ""}`}>
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsáveis
              </Label>
              <AssigneeSelector
                teamId={teamId}
                boardId={boardId}
                selectedUserIds={draft.assigneeIds}
                onChange={(ids) => updateDraft({ assigneeIds: ids })}
                hideIcon
              />
            </div>
          </div>

          {/* Status + Priority + Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={draft.statusId} onValueChange={(v) => updateDraft({ statusId: v })}>
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
              <Select value={draft.priority} onValueChange={(v) => updateDraft({ priority: v })}>
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
                value={draft.dueDate}
                onChange={(e) => updateDraft({ dueDate: e.target.value })}
                className="h-8"
              />
            </div>
          </div>

          {/* Dependency */}
          {existingSubdemands.length > 0 && (
            <div className="space-y-2">
              <Label>Depende de</Label>
              <Select
                value={draft.dependsOnIndex !== undefined ? String(draft.dependsOnIndex) : "none"}
                onValueChange={(v) => updateDraft({ dependsOnIndex: v === "none" ? undefined : Number(v) })}
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
              value={draft.description}
              onChange={(v) => updateDraft({ description: v })}
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
          disabled={!draft.title.trim()}
          size="sm"
          className="bg-[#F28705] hover:bg-[#F28705]/90 text-white"
        >
          {isEditing ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
