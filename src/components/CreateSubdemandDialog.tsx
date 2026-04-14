import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GitBranch } from "lucide-react";
import type { SubdemandInput } from "@/hooks/useSubdemands";

interface SubdemandFormData extends SubdemandInput {
  tempId: string;
  dependsOnIndex?: number;
}

interface CreateSubdemandDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SubdemandFormData) => void;
  existingSubdemands: SubdemandFormData[];
  editingIndex?: number;
  editingData?: SubdemandFormData | null;
}

export function CreateSubdemandDialog({
  open,
  onClose,
  onSave,
  existingSubdemands,
  editingIndex,
  editingData,
}: CreateSubdemandDialogProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("média");
  const [description, setDescription] = useState("");
  const [dependsOnIndex, setDependsOnIndex] = useState<number | undefined>(undefined);

  const isEditing = editingData != null;

  useEffect(() => {
    if (open && editingData) {
      setTitle(editingData.title);
      setPriority(editingData.priority || "média");
      setDescription(editingData.description || "");
      setDependsOnIndex(editingData.dependsOnIndex);
    } else if (open) {
      setTitle("");
      setPriority("média");
      setDescription("");
      setDependsOnIndex(undefined);
    }
  }, [open, editingData]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      tempId: editingData?.tempId || crypto.randomUUID(),
      title: title.trim(),
      priority,
      description: description.trim() || undefined,
      dependsOnIndex,
    });
    onClose();
  };

  // Filter out self from dependency list
  const availableDeps = existingSubdemands
    .map((s, i) => ({ ...s, idx: i }))
    .filter(({ idx }) => idx !== editingIndex);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-[#F28705]" />
            {isEditing ? "Editar Subdemanda" : "Nova Subdemanda"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sub-title">Título *</Label>
            <Input
              id="sub-title"
              placeholder="Ex: Criar layout da tela"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="média">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {existingSubdemands.length > 0 && (
              <div className="space-y-2">
                <Label>Depende de</Label>
                <Select
                  value={dependsOnIndex !== undefined ? String(dependsOnIndex) : "none"}
                  onValueChange={(v) => setDependsOnIndex(v === "none" ? undefined : Number(v))}
                >
                  <SelectTrigger className="h-9">
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
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Detalhes opcionais da subdemanda..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} size="sm">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
