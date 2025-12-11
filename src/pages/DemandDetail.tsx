import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDemands, useDemandInteractions, useCreateInteraction, useUpdateDemand, useDemandStatuses } from "@/hooks/useDemands";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useAuth } from "@/lib/auth";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { DemandEditForm } from "@/components/DemandEditForm";
import { ArrowLeft, Calendar, Users, MessageSquare, Archive, Pencil, Wrench } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function DemandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: demands } = useDemands();
  const { data: interactions } = useDemandInteractions(id!);
  const { data: assignees } = useDemandAssignees(id || null);
  const { data: statuses } = useDemandStatuses();
  const createInteraction = useCreateInteraction();
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const [comment, setComment] = useState("");
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const demand = demands?.find((d) => d.id === id);
  const { data: role } = useTeamRole(demand?.team_id || null);
  const canManageAssignees = role === "admin" || role === "moderator";
  const canEdit = role === "admin" || role === "moderator" || demand?.created_by === user?.id;
  const isCreator = demand?.created_by === user?.id;

  // Check if demand is delivered and user is creator
  const deliveredStatusId = statuses?.find((s) => s.name === "Entregue")?.id;
  const adjustmentStatusId = statuses?.find((s) => s.name === "Em Ajuste")?.id;
  const canRequestAdjustment = isCreator && demand?.status_id === deliveredStatusId;

  const handleRequestAdjustment = () => {
    if (!id || !adjustmentStatusId || !adjustmentReason.trim()) return;
    updateDemand.mutate(
      { id, status_id: adjustmentStatusId },
      {
        onSuccess: () => {
          toast.success("Ajuste solicitado com sucesso!");
          createInteraction.mutate({
            demand_id: id,
            interaction_type: "adjustment_request",
            content: `Solicitou ajuste: ${adjustmentReason.trim()}`,
          });
          setAdjustmentReason("");
          setIsAdjustmentDialogOpen(false);
        },
        onError: (error: any) => {
          toast.error("Erro ao solicitar ajuste", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  const handleArchive = () => {
    if (!id) return;
    updateDemand.mutate(
      {
        id,
        archived: true,
        archived_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Demanda arquivada com sucesso!");
          navigate("/demands");
        },
        onError: (error: any) => {
          toast.error("Erro ao arquivar demanda", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  const handleAddComment = () => {
    if (!comment.trim() || !id) return;

    createInteraction.mutate(
      {
        demand_id: id,
        interaction_type: "comment",
        content: comment.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Comentário adicionado!");
          setComment("");
        },
        onError: (error: any) => {
          toast.error("Erro ao adicionar comentário", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  const handleEditAssignees = () => {
    setSelectedAssignees(assignees?.map(a => a.user_id) || []);
    setEditingAssignees(true);
  };

  const handleSaveAssignees = () => {
    if (!id) return;
    setAssignees.mutate(
      { demandId: id, userIds: selectedAssignees },
      {
        onSuccess: () => {
          toast.success("Responsáveis atualizados!");
          setEditingAssignees(false);
        },
        onError: (error: any) => {
          toast.error("Erro ao atualizar responsáveis", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  if (!demand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Demanda não encontrada</p>
        <Button onClick={() => navigate("/demands")} className="mt-4">
          Voltar para Demandas
        </Button>
      </div>
    );
  }

  const formattedAssignees = assignees?.map(a => ({
    user_id: a.user_id,
    profile: a.profile,
  })) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/demands")}
          className="mb-2 md:mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-xl md:text-2xl">{demand.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {demand.demand_statuses && (
                  <Badge
                    style={{
                      backgroundColor: `${demand.demand_statuses.color}20`,
                      color: demand.demand_statuses.color,
                      borderColor: `${demand.demand_statuses.color}40`,
                    }}
                  >
                    {demand.demand_statuses.name}
                  </Badge>
                )}
                {demand.priority && (
                  <Badge variant="outline">{demand.priority}</Badge>
                )}
                {demand.teams && (
                  <Badge variant="secondary">{demand.teams.name}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {canRequestAdjustment && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdjustmentDialogOpen(true)}
                    className="w-full sm:w-auto border-purple-500/30 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Solicitar Ajuste
                  </Button>
                  <Dialog open={isAdjustmentDialogOpen} onOpenChange={(open) => {
                    setIsAdjustmentDialogOpen(open);
                    if (!open) setAdjustmentReason("");
                  }}>
                    <DialogContent className="max-w-[90vw] sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Solicitar ajuste</DialogTitle>
                        <DialogDescription>
                          Descreva o que precisa ser ajustado nesta demanda. A equipe receberá sua solicitação.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="adjustment-reason" className="text-sm font-medium">
                            Motivo do ajuste <span className="text-destructive">*</span>
                          </label>
                          <Textarea
                            id="adjustment-reason"
                            placeholder="Descreva o que precisa ser corrigido ou alterado..."
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="resize-none"
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {adjustmentReason.length}/1000
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAdjustmentDialogOpen(false);
                            setAdjustmentReason("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleRequestAdjustment}
                          disabled={!adjustmentReason.trim() || updateDemand.isPending}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {updateDemand.isPending ? "Enviando..." : "Solicitar Ajuste"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateDemand.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja arquivar esta demanda? Você poderá restaurá-la posteriormente na seção de demandas arquivadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive} className="w-full sm:w-auto">
                      Arquivar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
          {demand.description && (
            <div>
              <h3 className="font-semibold mb-2 text-sm md:text-base">Descrição</h3>
              <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                {demand.description}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {demand.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">
                  {format(new Date(demand.due_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Responsáveis:</span>
              </div>
              {editingAssignees ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="flex-1">
                    <AssigneeSelector
                      teamId={demand.team_id}
                      selectedUserIds={selectedAssignees}
                      onChange={setSelectedAssignees}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAssignees} disabled={setAssignees.isPending} className="flex-1 sm:flex-none">
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAssignees(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {formattedAssignees.length > 0 ? (
                    <AssigneeAvatars assignees={formattedAssignees} size="md" />
                  ) : (
                    <span className="text-muted-foreground">Nenhum</span>
                  )}
                  {canManageAssignees && (
                    <Button size="sm" variant="ghost" onClick={handleEditAssignees}>
                      Editar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
            Histórico de Interações
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Comentários e atualizações da demanda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <div className="space-y-2">
            <Textarea
              placeholder="Adicionar um comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="text-sm md:text-base"
            />
            <Button
              onClick={handleAddComment}
              disabled={!comment.trim() || createInteraction.isPending}
              className="w-full sm:w-auto"
            >
              {createInteraction.isPending ? "Enviando..." : "Enviar Comentário"}
            </Button>
          </div>

          <div className="space-y-3 md:space-y-4 pt-4">
            {interactions && interactions.length > 0 ? (
              interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex gap-2 md:gap-3 p-3 md:p-4 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0">
                    <AvatarImage src={interaction.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {interaction.profiles?.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold text-xs md:text-sm truncate">
                        {interaction.profiles?.full_name}
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        {format(
                          new Date(interaction.created_at),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </span>
                    </div>
                    {interaction.content && (
                      <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                        {interaction.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-6 md:py-8 text-sm">
                Nenhuma interação ainda. Seja o primeiro a comentar!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Demanda</DialogTitle>
            <DialogDescription>
              Atualize as informações da demanda
            </DialogDescription>
          </DialogHeader>
          <DemandEditForm
            demand={{
              id: demand.id,
              title: demand.title,
              description: demand.description,
              status_id: demand.status_id,
              priority: demand.priority,
              due_date: demand.due_date,
              service_id: demand.service_id,
              team_id: demand.team_id,
            }}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
