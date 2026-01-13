import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Briefcase, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useTeamPositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  TeamPosition,
} from "@/hooks/useTeamPositions";
import { CreatePositionDialog } from "@/components/CreatePositionDialog";
import { PositionBadge } from "@/components/PositionBadge";

interface TeamPositionsManagerProps {
  teamId: string;
  canManage: boolean;
  isAdmin: boolean;
}

export function TeamPositionsManager({ teamId, canManage, isAdmin }: TeamPositionsManagerProps) {
  const { data: positions, isLoading } = useTeamPositions(teamId);
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<TeamPosition | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateOrUpdate = async (data: { name: string; description?: string; color: string }) => {
    try {
      if (editingPosition) {
        await updatePosition.mutateAsync({
          positionId: editingPosition.id,
          teamId,
          ...data,
        });
        toast.success("Cargo atualizado com sucesso!");
      } else {
        await createPosition.mutateAsync({
          teamId,
          ...data,
        });
        toast.success("Cargo criado com sucesso!");
      }
      setDialogOpen(false);
      setEditingPosition(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar cargo");
    }
  };

  const handleDelete = async (positionId: string) => {
    setDeletingId(positionId);
    try {
      await deletePosition.mutateAsync({ positionId, teamId });
      toast.success("Cargo excluído com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cargo");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (position: TeamPosition) => {
    setEditingPosition(position);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPosition(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Cargos da Equipe
              </CardTitle>
              <CardDescription>
                Crie cargos personalizados para organizar sua equipe por área ou função
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={handleOpenCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar Cargo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!positions || positions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">Nenhum cargo cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie cargos para organizar sua equipe por área ou função (ex: Desenvolvedor, Designer, Analista)
              </p>
              {canManage && (
                <Button onClick={handleOpenCreate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro cargo
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <PositionBadge name={position.name} color={position.color} />
                    {position.description && (
                      <span className="text-sm text-muted-foreground truncate">
                        {position.description}
                      </span>
                    )}
                  </div>
                  
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(position)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={deletingId === position.id}
                            >
                              {deletingId === position.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o cargo <strong>"{position.name}"</strong>?
                                Os membros que possuem este cargo ficarão sem cargo atribuído.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(position.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePositionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPosition(null);
        }}
        onSubmit={handleCreateOrUpdate}
        isLoading={createPosition.isPending || updatePosition.isPending}
        editingPosition={editingPosition}
      />
    </>
  );
}
