import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, GripVertical, Trash2, Plus, Eye, Pencil, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
      
      const counts: Record<string, number> = {};
      (data || []).forEach(d => {
        counts[d.status_id] = (counts[d.status_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!boardId,
  });
}

// Side panel form for creating or editing a stage
function StageForm({
  mode,
  name,
  color,
  adjustmentType,
  onNameChange,
  onColorChange,
  onAdjustmentTypeChange,
  onSubmit,
  onBack,
  isPending,
}: {
  mode: 'create' | 'edit';
  name: string;
  color: string;
  adjustmentType: AdjustmentType;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onAdjustmentTypeChange: (v: AdjustmentType) => void;
  onSubmit: () => void;
  onBack: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-sm">
          {mode === 'create' ? 'Criar Nova Etapa' : 'Editar Etapa'}
        </h3>
      </div>

      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <Label htmlFor="stage-name">Nome da Etapa</Label>
          <Input
            id="stage-name"
            placeholder="Ex: Em Revisão"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={50}
            autoFocus
          />
        </div>
        <ColorPicker
          label="Cor da Etapa"
          value={color}
          onChange={onColorChange}
        />
        <div className="space-y-2">
          <Label htmlFor="stage-adjustment-type">Tipo de Aprovação</Label>
          <Select
            value={adjustmentType}
            onValueChange={(value: AdjustmentType) => onAdjustmentTypeChange(value)}
          >
            <SelectTrigger id="stage-adjustment-type">
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
                  Aprovação Interna
                </div>
              </SelectItem>
              <SelectItem value="external">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Aprovação Externa
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define quem pode solicitar ajustes nesta etapa.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-4 mt-auto">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={!name.trim() || isPending}
        >
          {isPending
            ? (mode === 'create' ? "Criando..." : "Salvando...")
            : (mode === 'create' ? "Criar Etapa" : "Salvar")}
        </Button>
      </div>
    </div>
  );
}

export function KanbanStagesManager({ boardId }: KanbanStagesManagerProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<BoardStatus | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3B82F6");
  const [newStatusAdjustmentType, setNewStatusAdjustmentType] = useState<AdjustmentType>("none");
  const [localStatuses, setLocalStatuses] = useState<BoardStatus[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedRolesId, setExpandedRolesId] = useState<string | null>(null);

  // Side panel: null = hidden, 'create' = new stage, 'edit' = edit stage
  const [sidePanel, setSidePanel] = useState<'create' | 'edit' | null>(null);
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [editingStatus, setEditingStatus] = useState<BoardStatus | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAdjustmentType, setEditAdjustmentType] = useState<AdjustmentType>("none");

  const { data: boardStatuses, isLoading } = useAllBoardStatuses(boardId);
  const { data: availableStatuses } = useAvailableStatuses();
  const { data: demandCounts } = useBoardDemandCounts(boardId);
  
  const toggleStatus = useToggleBoardStatus();
  const updatePositions = useUpdateBoardStatusPositions();
  const addStatus = useAddBoardStatus();
  const deleteStatus = useDeleteBoardStatus();
  const createCustomStatus = useCreateCustomStatus();

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

  const openCreatePanel = () => {
    setNewStatusName("");
    setNewStatusColor("#3B82F6");
    setNewStatusAdjustmentType("none");
    setSidePanel('create');
    // Small delay so the panel DOM is ready before animating in
    requestAnimationFrame(() => setSidePanelVisible(true));
  };

  const openEditPanel = (bs: BoardStatus) => {
    setEditingStatus(bs);
    setEditName(bs.status.name);
    setEditColor(bs.status.color);
    setEditAdjustmentType(bs.adjustment_type || "none");
    setSidePanel('edit');
    requestAnimationFrame(() => setSidePanelVisible(true));
  };

  const closeSidePanel = () => {
    setSidePanelVisible(false);
    // Wait for exit animation before unmounting content
    setTimeout(() => {
      setSidePanel(null);
      setEditingStatus(null);
    }, 250);
  };

  const handleEditStatus = async () => {
    if (!editingStatus || !editName.trim()) {
      toast.error("Digite um nome para a etapa");
      return;
    }
    try {
      const { error: statusError } = await supabase
        .from("demand_statuses")
        .update({ name: editName.trim(), color: editColor })
        .eq("id", editingStatus.status_id);
      if (statusError) throw statusError;

      const { error: boardError } = await supabase
        .from("board_statuses")
        .update({ adjustment_type: editAdjustmentType })
        .eq("id", editingStatus.id);
      if (boardError) throw boardError;

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
      closeSidePanel();
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("Já existe uma etapa com esse nome");
      } else {
        toast.error("Erro ao atualizar etapa");
      }
    }
  };

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSidePanel(null);
      setSidePanelVisible(false);
      setEditingStatus(null);
      queryClient.refetchQueries({ queryKey: ["board-statuses", boardId] });
      queryClient.refetchQueries({ queryKey: ["board-statuses-all", boardId] });
    }
  }, [boardId, queryClient]);

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

    const newStatuses = [...localStatuses];
    const [removed] = newStatuses.splice(dragIndex, 1);
    newStatuses.splice(targetIndex, 0, removed);

    const updatedStatuses = newStatuses.map((s, i) => ({ ...s, position: i }));
    setLocalStatuses(updatedStatuses);

    try {
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

  const handleDeleteClick = (status: BoardStatus) => {
    const demandCount = demandCounts?.[status.status_id] || 0;
    
    if (isFixedBoundaryStatus(status.status.name)) {
      toast.error(`A etapa "${status.status.name}" é essencial para o fluxo e não pode ser removida`);
      return;
    }
    
    if (demandCount > 0) {
      toast.error(`Esta etapa possui ${demandCount} demanda${demandCount === 1 ? '' : 's'}. Mova para outra etapa antes de excluir.`);
      return;
    }
    
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
      closeSidePanel();
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Etapas</span>
          </Button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          {/* Custom centered layout: main modal + floating side panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="flex items-start gap-3 pointer-events-auto max-w-[95vw]">
              {/* Main modal card */}
              <DialogPrimitive.Content
                className={cn(
                  "relative bg-background border border-border rounded-xl shadow-2xl p-0 overflow-hidden",
                  "w-[90vw] sm:w-[52vw] lg:w-[45vw] max-h-[85vh]",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "duration-200",
                  // On mobile when side panel is open, hide main
                  sidePanel ? "hidden sm:flex sm:flex-col" : "flex flex-col"
                )}
              >
                {/* Close button */}
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>

                <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                  <DialogTitle>Gerenciar Etapas do Kanban</DialogTitle>
                  <DialogDescription>
                    Configure as etapas visíveis neste quadro. Arraste para reordenar, ative/desative ou adicione novas etapas.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                  <Button variant="outline" className="w-full gap-2" onClick={openCreatePanel}>
                    <Plus className="h-4 w-4" />
                    Criar Nova Etapa
                  </Button>

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
                                  isEndStatus && "bg-primary/5 border-primary/20",
                                  isDragging && "opacity-50 scale-95 border-dashed",
                                  isDragOver && "border-primary border-2 bg-primary/5",
                                  !isDragging && !isDragOver && !isEndStatus && "bg-card hover:shadow-sm"
                                )}
                              >
                                <div className="flex items-center gap-2 p-3">
                                  <div className={cn(
                                    "cursor-grab active:cursor-grabbing shrink-0",
                                    !canDrag && "opacity-30 cursor-not-allowed"
                                  )}>
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>

                                  <div
                                    className="h-3 w-3 rounded-full shrink-0 ring-2 ring-background shadow-sm"
                                    style={{ backgroundColor: bs.status.color }}
                                  />
                                  <span className={cn(
                                    "font-medium text-sm truncate flex-1",
                                    !bs.is_active && "text-muted-foreground line-through"
                                  )}>
                                    {bs.status.name}
                                  </span>

                                  {isFixedStatus && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary shrink-0">
                                      Fixa
                                    </Badge>
                                  )}

                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                    {demandCounts[bs.status_id] || 0} demandas
                                  </Badge>

                                  {!isFixedStatus && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                          onClick={() => openEditPanel(bs)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar etapa</TooltipContent>
                                    </Tooltip>
                                  )}

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
                    Arraste as demais etapas pelo ícone ⠿ para reordená-las.
                    Desativar uma etapa apenas a oculta no Kanban.
                  </p>
                </div>
              </DialogPrimitive.Content>

              {/* Floating side panel — separate card with gap */}
              {sidePanel && (
                <div
                  className={cn(
                    "bg-background border border-border rounded-xl shadow-2xl overflow-hidden",
                    "w-[90vw] sm:w-[280px] max-h-[85vh] overflow-y-auto",
                    "animate-in fade-in-0 slide-in-from-left-4 zoom-in-95 duration-300"
                  )}
                >
                  <div className="p-6">
                    {sidePanel === 'create' && (
                      <StageForm
                        mode="create"
                        name={newStatusName}
                        color={newStatusColor}
                        adjustmentType={newStatusAdjustmentType}
                        onNameChange={setNewStatusName}
                        onColorChange={setNewStatusColor}
                        onAdjustmentTypeChange={setNewStatusAdjustmentType}
                        onSubmit={handleCreateStatus}
                        onBack={closeSidePanel}
                        isPending={createCustomStatus.isPending}
                      />
                    )}
                    {sidePanel === 'edit' && (
                      <StageForm
                        mode="edit"
                        name={editName}
                        color={editColor}
                        adjustmentType={editAdjustmentType}
                        onNameChange={setEditName}
                        onColorChange={setEditColor}
                        onAdjustmentTypeChange={setEditAdjustmentType}
                        onSubmit={handleEditStatus}
                        onBack={closeSidePanel}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Mobile: show side panel as full card when main is hidden */}
              {sidePanel && (
                <DialogPrimitive.Content
                  className={cn(
                    "sm:hidden bg-background border border-border rounded-xl shadow-2xl overflow-hidden",
                    "w-[90vw] max-h-[85vh] overflow-y-auto",
                    "animate-in fade-in-0 zoom-in-95 duration-200"
                  )}
                >
                  <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 z-10">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                  <div className="p-6">
                    {sidePanel === 'create' && (
                      <StageForm
                        mode="create"
                        name={newStatusName}
                        color={newStatusColor}
                        adjustmentType={newStatusAdjustmentType}
                        onNameChange={setNewStatusName}
                        onColorChange={setNewStatusColor}
                        onAdjustmentTypeChange={setNewStatusAdjustmentType}
                        onSubmit={handleCreateStatus}
                        onBack={closeSidePanel}
                        isPending={createCustomStatus.isPending}
                      />
                    )}
                    {sidePanel === 'edit' && (
                      <StageForm
                        mode="edit"
                        name={editName}
                        color={editColor}
                        adjustmentType={editAdjustmentType}
                        onNameChange={setEditName}
                        onColorChange={setEditColor}
                        onAdjustmentTypeChange={setEditAdjustmentType}
                        onSubmit={handleEditStatus}
                        onBack={closeSidePanel}
                      />
                    )}
                  </div>
                </DialogPrimitive.Content>
              )}
            </div>
          </div>
        </DialogPortal>
      </Dialog>

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
