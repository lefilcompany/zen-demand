import { useState, useEffect } from "react";
import { Settings, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useAllBoardStatuses,
  useAvailableStatuses,
  useToggleBoardStatus,
  useUpdateBoardStatusPositions,
  useAddBoardStatus,
  useDeleteBoardStatus,
  useCreateCustomStatus,
  BoardStatus,
} from "@/hooks/useBoardStatuses";
import { ColorPicker } from "@/components/ColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface KanbanStagesManagerProps {
  boardId: string;
}

// Hook to fetch demand counts for all statuses in a board
function useBoardDemandCounts(boardId: string | null) {
  return useQuery({
    queryKey: ["board-demand-counts", boardId],
    queryFn: async () => {
      if (!boardId) return {};
      
      const { data, error } = await supabase
        .from("demands")
        .select("status_id")
        .eq("board_id", boardId);

      if (error) throw error;
      
      // Count demands per status
      const counts: Record<string, number> = {};
      (data || []).forEach(d => {
        counts[d.status_id] = (counts[d.status_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!boardId,
  });
}

export function KanbanStagesManager({ boardId }: KanbanStagesManagerProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<BoardStatus | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3B82F6");
  const [localStatuses, setLocalStatuses] = useState<BoardStatus[]>([]);

  const { data: boardStatuses, isLoading } = useAllBoardStatuses(boardId);
  const { data: availableStatuses } = useAvailableStatuses();
  const { data: demandCounts } = useBoardDemandCounts(boardId);
  
  const toggleStatus = useToggleBoardStatus();
  const updatePositions = useUpdateBoardStatusPositions();
  const addStatus = useAddBoardStatus();
  const deleteStatus = useDeleteBoardStatus();
  const createCustomStatus = useCreateCustomStatus();

  // Keep local state in sync with server data
  useEffect(() => {
    if (boardStatuses) {
      setLocalStatuses(boardStatuses);
    }
  }, [boardStatuses]);

  const handleToggleStatus = async (boardStatusId: string, isActive: boolean) => {
    try {
      await toggleStatus.mutateAsync({ boardStatusId, isActive, boardId });
      toast.success(isActive ? "Etapa ativada" : "Etapa desativada");
    } catch (error) {
      toast.error("Erro ao alterar status da etapa");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const newStatuses = [...localStatuses];
    [newStatuses[index - 1], newStatuses[index]] = [newStatuses[index], newStatuses[index - 1]];
    setLocalStatuses(newStatuses);
    
    try {
      await updatePositions.mutateAsync({
        updates: newStatuses.map((s, i) => ({ id: s.id, position: i })),
        boardId,
      });
    } catch (error) {
      toast.error("Erro ao reordenar etapas");
      setLocalStatuses(boardStatuses || []);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === localStatuses.length - 1) return;
    
    const newStatuses = [...localStatuses];
    [newStatuses[index], newStatuses[index + 1]] = [newStatuses[index + 1], newStatuses[index]];
    setLocalStatuses(newStatuses);
    
    try {
      await updatePositions.mutateAsync({
        updates: newStatuses.map((s, i) => ({ id: s.id, position: i })),
        boardId,
      });
    } catch (error) {
      toast.error("Erro ao reordenar etapas");
      setLocalStatuses(boardStatuses || []);
    }
  };

  const handleAddStatus = async (statusId: string) => {
    const maxPosition = localStatuses.reduce((max, s) => Math.max(max, s.position), -1);
    
    try {
      await addStatus.mutateAsync({
        boardId,
        statusId,
        position: maxPosition + 1,
      });
      toast.success("Etapa adicionada ao quadro");
    } catch (error) {
      toast.error("Erro ao adicionar etapa");
    }
  };

  const handleDeleteClick = (status: BoardStatus) => {
    setStatusToDelete(status);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!statusToDelete) return;
    
    try {
      await deleteStatus.mutateAsync({
        boardStatusId: statusToDelete.id,
        boardId,
      });
      toast.success("Etapa removida do quadro");
      setDeleteDialogOpen(false);
      setStatusToDelete(null);
    } catch (error) {
      toast.error("Erro ao remover etapa");
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error("Digite um nome para a etapa");
      return;
    }
    
    try {
      await createCustomStatus.mutateAsync({
        name: newStatusName.trim(),
        color: newStatusColor,
        boardId,
      });
      toast.success("Etapa personalizada criada");
      setCreateDialogOpen(false);
      setNewStatusName("");
      setNewStatusColor("#3B82F6");
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("Já existe uma etapa com esse nome");
      } else {
        toast.error("Erro ao criar etapa");
      }
    }
  };

  // Filter available statuses that are not already in the board
  const addableStatuses = availableStatuses?.filter(
    (as) => !localStatuses.some((bs) => bs.status_id === as.id)
  ) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Etapas</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gerenciar Etapas do Kanban</SheetTitle>
            <SheetDescription>
              Configure as etapas visíveis neste quadro. Reordene, ative/desative ou adicione novas etapas.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Create new status button */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Nova Etapa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Etapa Personalizada</DialogTitle>
                  <DialogDescription>
                    Crie uma nova etapa exclusiva para este quadro.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="status-name">Nome da Etapa</Label>
                    <Input
                      id="status-name"
                      placeholder="Ex: Em Revisão"
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <ColorPicker
                    label="Cor da Etapa"
                    value={newStatusColor}
                    onChange={setNewStatusColor}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateStatus} 
                    disabled={!newStatusName.trim() || createCustomStatus.isPending}
                  >
                    {createCustomStatus.isPending ? "Criando..." : "Criar Etapa"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add existing system status */}
            {addableStatuses.length > 0 && (
              <div className="space-y-2">
                <Label>Adicionar Etapa do Sistema</Label>
                <Select onValueChange={handleAddStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar etapa..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {addableStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Current stages list */}
            <div className="space-y-2">
              <Label>Etapas do Quadro ({localStatuses.length})</Label>
              
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Carregando...
                </div>
              ) : localStatuses.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhuma etapa configurada
                </div>
              ) : (
                <div className="space-y-2">
                  <TooltipProvider>
                    {localStatuses.map((bs, index) => {
                      const demandCount = demandCounts?.[bs.status_id] || 0;
                      const canDelete = demandCount === 0;
                      // Type assertion for status since the query returns is_system
                      const isSystemStatus = (bs.status as any)?.is_system !== false;
                      
                      return (
                        <div
                          key={bs.id}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border transition-all",
                            bs.is_active 
                              ? "bg-background" 
                              : "bg-muted/50 opacity-60"
                          )}
                        >
                          {/* Move buttons */}
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={index === 0}
                              onClick={() => handleMoveUp(index)}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={index === localStatuses.length - 1}
                              onClick={() => handleMoveDown(index)}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Color indicator */}
                          <div
                            className="w-4 h-4 rounded-full shrink-0 border"
                            style={{ backgroundColor: bs.status.color }}
                          />

                          {/* Name */}
                          <span className="flex-1 font-medium text-sm truncate">
                            {bs.status.name}
                          </span>

                          {/* Demand count badge */}
                          <Badge variant="outline" className="text-xs shrink-0">
                            {demandCount} {demandCount === 1 ? "demanda" : "demandas"}
                          </Badge>

                          {/* Active toggle */}
                          <Switch
                            checked={bs.is_active}
                            onCheckedChange={(checked) => handleToggleStatus(bs.id, checked)}
                            disabled={toggleStatus.isPending}
                          />

                          {/* Delete button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 shrink-0",
                                  canDelete && !isSystemStatus
                                    ? "text-destructive hover:bg-destructive/10"
                                    : "text-muted-foreground cursor-not-allowed opacity-50"
                                )}
                                disabled={!canDelete || isSystemStatus}
                                onClick={() => canDelete && !isSystemStatus && handleDeleteClick(bs)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isSystemStatus
                                ? "Etapas do sistema não podem ser removidas"
                                : !canDelete
                                ? `Não é possível remover: ${demandCount} demanda(s) nesta etapa`
                                : "Remover etapa do quadro"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </TooltipProvider>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Desativar uma etapa apenas a oculta no Kanban. As demandas existentes não são afetadas.
              Para remover uma etapa personalizada, ela deve estar vazia (sem demandas).
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover etapa do quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              A etapa "{statusToDelete?.status.name}" será removida deste quadro. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStatus.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
