import { useState, useEffect, useCallback } from "react";
import { Settings, GripVertical, Trash2, Plus, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  isFixedBoundaryStatus,
  FIXED_END_STATUS,
  AdjustmentType,
  BOARD_ROLES,
  BoardRoleType,
} from "@/hooks/useBoardStatuses";
import { ColorPicker } from "@/components/ColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<BoardStatus | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3B82F6");
  const [newStatusAdjustmentType, setNewStatusAdjustmentType] = useState<AdjustmentType>("none");
  const [localStatuses, setLocalStatuses] = useState<BoardStatus[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: boardStatuses, isLoading } = useAllBoardStatuses(boardId);
  const { data: availableStatuses } = useAvailableStatuses();
  const { data: demandCounts } = useBoardDemandCounts(boardId);
  
  const toggleStatus = useToggleBoardStatus();
  const updatePositions = useUpdateBoardStatusPositions(); // kept for type imports
  const addStatus = useAddBoardStatus();
  const deleteStatus = useDeleteBoardStatus();
  const createCustomStatus = useCreateCustomStatus();

  const [expandedRolesId, setExpandedRolesId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<BoardStatus | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAdjustmentType, setEditAdjustmentType] = useState<AdjustmentType>("none");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleUpdateVisibleRoles = async (boardStatusId: string, roles: string[]) => {
    try {
      const value = roles.length === 0 || roles.length === BOARD_ROLES.length ? null : roles;
      const { error } = await supabase
        .from("board_statuses")
        .update({ visible_to_roles: value })
        .eq("id", boardStatusId);
      if (error) throw error;
      
      setLocalStatuses(prev => prev.map(s => 
        s.id === boardStatusId ? { ...s, visible_to_roles: value } : s
      ));
      toast.success("Visibilidade atualizada");
    } catch {
      toast.error("Erro ao atualizar visibilidade");
    }
  };

  const openEditDialog = (bs: BoardStatus) => {
    setEditingStatus(bs);
    setEditName(bs.status.name);
    setEditColor(bs.status.color);
    setEditAdjustmentType(bs.adjustment_type || "none");
    setEditDialogOpen(true);
  };

  const handleEditStatus = async () => {
    if (!editingStatus || !editName.trim()) {
      toast.error("Digite um nome para a etapa");
      return;
    }
    try {
      // Update the status name and color in demand_statuses
      const { error: statusError } = await supabase
        .from("demand_statuses")
        .update({ name: editName.trim(), color: editColor })
        .eq("id", editingStatus.status_id);
      if (statusError) throw statusError;

      // Update adjustment_type in board_statuses
      const { error: boardError } = await supabase
        .from("board_statuses")
        .update({ adjustment_type: editAdjustmentType })
        .eq("id", editingStatus.id);
      if (boardError) throw boardError;

      // Update local state
      setLocalStatuses(prev => prev.map(s => 
        s.id === editingStatus.id 
          ? { 
              ...s, 
              adjustment_type: editAdjustmentType,
              status: { ...s.status, name: editName.trim(), color: editColor }
            } 
          : s
      ));

      queryClient.invalidateQueries({ queryKey: ["board-statuses", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-statuses-all", boardId] });
      queryClient.invalidateQueries({ queryKey: ["demand-statuses"] });

      toast.success("Etapa atualizada");
      setEditDialogOpen(false);
      setEditingStatus(null);
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("Já existe uma etapa com esse nome");
      } else {
        toast.error("Erro ao atualizar etapa");
      }
    }
  };

  // Handle sheet open/close and force refetch on close
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Force refetch when sheet closes to ensure Kanban is in sync
      queryClient.refetchQueries({ queryKey: ["board-statuses", boardId] });
      queryClient.refetchQueries({ queryKey: ["board-statuses-all", boardId] });
    }
  }, [boardId, queryClient]);

  // Keep local state in sync with server data, ensuring "Entregue" is always last
  useEffect(() => {
    if (boardStatuses) {
      const sorted = [...boardStatuses].sort((a, b) => {
        const aIsEnd = a.status.name === FIXED_END_STATUS;
        const bIsEnd = b.status.name === FIXED_END_STATUS;
        
        if (aIsEnd) return 1;
        if (bIsEnd) return -1;
        return a.position - b.position;
      });
      setLocalStatuses(sorted);
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

  const handleDragStart = (index: number) => {
    const status = localStatuses[index];
    if (isFixedBoundaryStatus(status.status.name)) return;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const targetStatus = localStatuses[index];
    if (isFixedBoundaryStatus(targetStatus.status.name) && targetStatus.status.name === FIXED_END_STATUS) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = useCallback(async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex || isMoving) return;
    
    const draggedStatus = localStatuses[dragIndex];
    const targetStatus = localStatuses[targetIndex];
    
    if (isFixedBoundaryStatus(draggedStatus.status.name) || 
        (isFixedBoundaryStatus(targetStatus.status.name) && targetStatus.status.name === FIXED_END_STATUS)) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setIsMoving(true);

    // Reorder locally
    const newStatuses = [...localStatuses];
    const [removed] = newStatuses.splice(dragIndex, 1);
    newStatuses.splice(targetIndex, 0, removed);

    // Reassign positions (skip the fixed end status at the last position)
    const updatedStatuses = newStatuses.map((s, i) => ({ ...s, position: i }));
    setLocalStatuses(updatedStatuses);

    try {
      // Persist all position changes
      const updates = updatedStatuses.map((s) =>
        supabase.from("board_statuses").update({ position: s.position }).eq("id", s.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["board-statuses", boardId] }),
        queryClient.refetchQueries({ queryKey: ["board-statuses-all", boardId] }),
      ]);
    } catch (error) {
      toast.error("Erro ao reordenar etapas");
      // Revert
      if (boardStatuses) {
        const sorted = [...boardStatuses].sort((a, b) => {
          if (a.status.name === FIXED_END_STATUS) return 1;
          if (b.status.name === FIXED_END_STATUS) return -1;
          return a.position - b.position;
        });
        setLocalStatuses(sorted);
      }
    } finally {
      setIsMoving(false);
      setDragIndex(null);
      setDragOverIndex(null);
    }
  }, [dragIndex, localStatuses, isMoving, boardId, boardStatuses, queryClient]);

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
    const demandCount = demandCounts?.[status.status_id] || 0;
    
    // Check if it's a fixed boundary status (A Iniciar or Entregue)
    if (isFixedBoundaryStatus(status.status.name)) {
      toast.error(`A etapa "${status.status.name}" é essencial para o fluxo e não pode ser removida`);
      return;
    }
    
    // Check if has demands - this is more actionable for the user
    if (demandCount > 0) {
      toast.error(`Esta etapa possui ${demandCount} demanda${demandCount === 1 ? '' : 's'}. Mova para outra etapa antes de excluir.`);
      return;
    }
    
    // No demands and not fixed, show confirmation
    setStatusToDelete(status);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!statusToDelete) return;
    
    try {
      await deleteStatus.mutateAsync({
        boardStatusId: statusToDelete.id,
        boardId,
        statusId: statusToDelete.status_id,
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
        adjustmentType: newStatusAdjustmentType,
      });
      toast.success("Etapa personalizada criada");
      setCreateDialogOpen(false);
      setNewStatusName("");
      setNewStatusColor("#3B82F6");
      setNewStatusAdjustmentType("none");
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
      <Sheet open={open} onOpenChange={handleOpenChange}>
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
              Configure as etapas visíveis neste quadro. Arraste para reordenar, ative/desative ou adicione novas etapas.
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
                  <div className="space-y-2">
                    <Label htmlFor="adjustment-type">Tipo de Aprovação</Label>
                    <Select 
                      value={newStatusAdjustmentType} 
                      onValueChange={(value: AdjustmentType) => setNewStatusAdjustmentType(value)}
                    >
                      <SelectTrigger id="adjustment-type">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                            Nenhum (etapa normal)
                          </div>
                        </SelectItem>
                        <SelectItem value="internal">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Aprovação Interna (Admins/Moderadores)
                          </div>
                        </SelectItem>
                        <SelectItem value="external">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            Aprovação Externa (Solicitantes)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define quem pode solicitar ajustes nesta etapa.
                    </p>
                  </div>
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
                      const isFixedStatus = isFixedBoundaryStatus(bs.status.name);
                      const isEndStatus = bs.status.name === FIXED_END_STATUS;
                      const isDragging = dragIndex === index;
                      const isDragOver = dragOverIndex === index && dragIndex !== index;
                      const canDrag = !isFixedStatus && !isMoving;
                      
                      return (
                        <div
                          key={bs.id}
                          draggable={canDrag}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          onDrop={() => handleDrop(index)}
                          className={cn(
                            "rounded-lg border transition-all duration-200",
                            bs.is_active 
                              ? "bg-background" 
                              : "bg-muted/50 opacity-60",
                            isFixedStatus && "border-primary/30 bg-primary/5",
                            isDragging && "opacity-40 scale-95 border-dashed",
                            isDragOver && !isEndStatus && "border-primary shadow-md scale-[1.02]",
                          )}
                        >
                          <div className={cn(
                            "flex items-center gap-2 p-3",
                            canDrag && "cursor-grab active:cursor-grabbing"
                          )}>
                            {/* Drag handle */}
                            <div className={cn(
                              "shrink-0 text-muted-foreground",
                              isFixedStatus && "opacity-30",
                              canDrag && "hover:text-foreground"
                            )}>
                              <GripVertical className="h-4 w-4" />
                            </div>

                            {/* Color indicator */}
                            <div
                              className="w-4 h-4 rounded-full shrink-0 border"
                              style={{ backgroundColor: bs.status.color }}
                            />

                            {/* Name with fixed indicator */}
                            <span className="flex-1 font-medium text-sm truncate flex items-center gap-2">
                              {bs.status.name}
                              {isFixedStatus && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Fixa
                                </Badge>
                              )}
                            </span>

                            {/* Demand count badge */}
                            <Badge variant="outline" className="text-xs shrink-0">
                              {demandCounts?.[bs.status_id] || 0} {(demandCounts?.[bs.status_id] || 0) === 1 ? "demanda" : "demandas"}
                            </Badge>

                            {/* Edit button - not for fixed statuses */}
                            {!isFixedStatus && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => openEditDialog(bs)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar etapa</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Role visibility toggle */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 shrink-0",
                                    bs.visible_to_roles && bs.visible_to_roles.length > 0
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  )}
                                  onClick={() => setExpandedRolesId(expandedRolesId === bs.id ? null : bs.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {bs.visible_to_roles && bs.visible_to_roles.length > 0
                                  ? `Visível para: ${bs.visible_to_roles.map(r => BOARD_ROLES.find(br => br.value === r)?.label).join(', ')}`
                                  : "Visível para todos"
                                }
                              </TooltipContent>
                            </Tooltip>

                            {/* Active toggle - fixed statuses cannot be deactivated */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Switch
                                    checked={bs.is_active}
                                    onCheckedChange={(checked) => handleToggleStatus(bs.id, checked)}
                                    disabled={toggleStatus.isPending || isFixedStatus}
                                  />
                                </span>
                              </TooltipTrigger>
                              {isFixedStatus && (
                                <TooltipContent>Etapas fixas não podem ser desativadas</TooltipContent>
                              )}
                            </Tooltip>

                            {/* Delete button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 shrink-0",
                                    isFixedStatus 
                                      ? "text-muted-foreground/30 cursor-not-allowed" 
                                      : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  )}
                                  onClick={() => !isFixedStatus && handleDeleteClick(bs)}
                                  disabled={isFixedStatus}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isFixedStatus 
                                  ? "Etapas fixas não podem ser removidas" 
                                  : "Remover etapa do quadro"
                                }
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Expanded role visibility section */}
                          {expandedRolesId === bs.id && (
                            <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">Visível para:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {BOARD_ROLES.map(role => {
                                  const currentRoles = bs.visible_to_roles || [];
                                  const isAll = currentRoles.length === 0;
                                  const isChecked = isAll || currentRoles.includes(role.value);
                                  
                                  return (
                                    <label key={role.value} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          let newRoles: string[];
                                          if (isAll) {
                                            // Currently "all" - unchecking one means select all except this
                                            newRoles = BOARD_ROLES.filter(r => r.value !== role.value).map(r => r.value);
                                          } else if (checked) {
                                            newRoles = [...currentRoles, role.value];
                                          } else {
                                            newRoles = currentRoles.filter(r => r !== role.value);
                                            if (newRoles.length === 0) {
                                              toast.error("Pelo menos um papel deve ter acesso");
                                              return;
                                            }
                                          }
                                          handleUpdateVisibleRoles(bs.id, newRoles);
                                        }}
                                      />
                                      {role.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </TooltipProvider>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              A etapa "Entregue" é fixa e essencial para o fluxo de demandas. 
              Arraste as demais etapas pelo ícone ⠿ para reordená-las. Desativar uma etapa apenas a oculta no Kanban.
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

      {/* Edit stage dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
            <DialogDescription>
              Altere o nome, cor ou tipo de aprovação da etapa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status-name">Nome da Etapa</Label>
              <Input
                id="edit-status-name"
                placeholder="Ex: Em Revisão"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
              />
            </div>
            <ColorPicker
              label="Cor da Etapa"
              value={editColor}
              onChange={setEditColor}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-adjustment-type">Tipo de Aprovação</Label>
              <Select 
                value={editAdjustmentType} 
                onValueChange={(value: AdjustmentType) => setEditAdjustmentType(value)}
              >
                <SelectTrigger id="edit-adjustment-type">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      Nenhum (etapa normal)
                    </div>
                  </SelectItem>
                  <SelectItem value="internal">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Aprovação Interna (Admins/Moderadores)
                    </div>
                  </SelectItem>
                  <SelectItem value="external">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      Aprovação Externa (Solicitantes)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditStatus} 
              disabled={!editName.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
