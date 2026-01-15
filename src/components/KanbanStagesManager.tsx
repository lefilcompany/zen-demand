import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAllBoardStatuses,
  useAvailableStatuses,
  useToggleBoardStatus,
  useUpdateBoardStatusPositions,
  useAddBoardStatus,
  getStatusColor,
  BoardStatus,
} from "@/hooks/useBoardStatuses";
import { useTranslation } from "react-i18next";

interface KanbanStagesManagerProps {
  boardId: string;
  teamId: string | null;
}

export function KanbanStagesManager({ boardId, teamId }: KanbanStagesManagerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  
  const { data: boardStatuses, isLoading: loadingStatuses } = useAllBoardStatuses(boardId);
  const { data: availableStatuses } = useAvailableStatuses();
  
  const toggleStatus = useToggleBoardStatus();
  const updatePositions = useUpdateBoardStatusPositions();
  const addStatus = useAddBoardStatus();

  // Get statuses that are not yet added to the board
  const unaddedStatuses = availableStatuses?.filter(
    (s) => !boardStatuses?.some((bs) => bs.status_id === s.id)
  ) || [];

  const handleToggleStatus = useCallback(async (boardStatusId: string, currentActive: boolean) => {
    try {
      await toggleStatus.mutateAsync({
        boardStatusId,
        isActive: !currentActive,
        boardId,
      });
      toast.success(currentActive ? "Etapa desativada" : "Etapa ativada");
    } catch (error) {
      toast.error("Erro ao alterar etapa");
    }
  }, [toggleStatus, boardId]);

  const handleMoveUp = useCallback(async (index: number) => {
    if (!boardStatuses || index <= 0) return;
    
    const newStatuses = [...boardStatuses];
    const temp = newStatuses[index - 1];
    newStatuses[index - 1] = newStatuses[index];
    newStatuses[index] = temp;
    
    const updates = newStatuses.map((s, i) => ({ id: s.id, position: i }));
    
    try {
      await updatePositions.mutateAsync({ updates, boardId });
      toast.success("Ordem atualizada");
    } catch (error) {
      toast.error("Erro ao reordenar");
    }
  }, [boardStatuses, updatePositions, boardId]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (!boardStatuses || index >= boardStatuses.length - 1) return;
    
    const newStatuses = [...boardStatuses];
    const temp = newStatuses[index + 1];
    newStatuses[index + 1] = newStatuses[index];
    newStatuses[index] = temp;
    
    const updates = newStatuses.map((s, i) => ({ id: s.id, position: i }));
    
    try {
      await updatePositions.mutateAsync({ updates, boardId });
      toast.success("Ordem atualizada");
    } catch (error) {
      toast.error("Erro ao reordenar");
    }
  }, [boardStatuses, updatePositions, boardId]);

  const handleAddStatus = useCallback(async (statusId: string) => {
    if (!boardStatuses) return;
    
    const maxPosition = Math.max(...boardStatuses.map(s => s.position), -1);
    
    try {
      await addStatus.mutateAsync({
        boardId,
        statusId,
        position: maxPosition + 1,
      });
      toast.success("Etapa adicionada");
    } catch (error) {
      toast.error("Erro ao adicionar etapa");
    }
  }, [boardStatuses, addStatus, boardId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Etapas</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Etapas do Kanban</SheetTitle>
          <SheetDescription>
            Configure as etapas visíveis neste quadro. Reordene, ative ou desative conforme necessário.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Active statuses list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Etapas do Quadro
            </h4>
            
            {loadingStatuses ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : boardStatuses && boardStatuses.length > 0 ? (
              <div className="space-y-2">
                {boardStatuses.map((bs, index) => (
                  <div
                    key={bs.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      bs.is_active 
                        ? "bg-card border-border" 
                        : "bg-muted/50 border-dashed opacity-60"
                    )}
                  >
                    {/* Position controls */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={index === 0 || updatePositions.isPending}
                        onClick={() => handleMoveUp(index)}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={index === boardStatuses.length - 1 || updatePositions.isPending}
                        onClick={() => handleMoveDown(index)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Status color indicator */}
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full shrink-0",
                        getStatusColor(bs.status.name).replace('/10', '')
                      )}
                      style={{ backgroundColor: bs.status.color }}
                    />
                    
                    {/* Status name */}
                    <span className="flex-1 text-sm font-medium truncate">
                      {bs.status.name}
                    </span>
                    
                    {/* Position badge */}
                    <Badge variant="outline" className="text-xs shrink-0">
                      {index + 1}
                    </Badge>
                    
                    {/* Active toggle */}
                    <Switch
                      checked={bs.is_active}
                      onCheckedChange={() => handleToggleStatus(bs.id, bs.is_active)}
                      disabled={toggleStatus.isPending}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                Nenhuma etapa configurada
              </div>
            )}
          </div>

          {/* Add new status */}
          {unaddedStatuses.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Adicionar Etapa
              </h4>
              <Select onValueChange={handleAddStatus} disabled={addStatus.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa para adicionar..." />
                </SelectTrigger>
                <SelectContent>
                  {unaddedStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Help text */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Desativar uma etapa apenas a oculta do Kanban. 
              As demandas existentes nessa etapa não serão afetadas e continuarão acessíveis.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
