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
import { useDemands, useDemandInteractions, useCreateInteraction, useUpdateDemand } from "@/hooks/useDemands";
import { useDemandAssignees, useSetAssignees } from "@/hooks/useDemandAssignees";
import { useTeamRole } from "@/hooks/useTeamRole";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { ArrowLeft, Calendar, Users, MessageSquare, Archive } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function DemandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: demands } = useDemands();
  const { data: interactions } = useDemandInteractions(id!);
  const { data: assignees } = useDemandAssignees(id || null);
  const createInteraction = useCreateInteraction();
  const updateDemand = useUpdateDemand();
  const setAssignees = useSetAssignees();
  const [comment, setComment] = useState("");
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const demand = demands?.find((d) => d.id === id);
  const { data: role } = useTeamRole(demand?.team_id || null);
  const canManageAssignees = role === "admin" || role === "moderator";

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/demands")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">{demand.title}</CardTitle>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updateDemand.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar demanda?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja arquivar esta demanda? Você poderá restaurá-la posteriormente na seção de demandas arquivadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive}>
                    Arquivar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {demand.description && (
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {demand.description}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {demand.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">
                  {format(new Date(demand.due_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Responsáveis:</span>
              {editingAssignees ? (
                <div className="flex items-center gap-2 flex-1">
                  <AssigneeSelector
                    teamId={demand.team_id}
                    selectedUserIds={selectedAssignees}
                    onChange={setSelectedAssignees}
                  />
                  <Button size="sm" onClick={handleSaveAssignees} disabled={setAssignees.isPending}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingAssignees(false)}>
                    Cancelar
                  </Button>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Histórico de Interações
          </CardTitle>
          <CardDescription>
            Comentários e atualizações da demanda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Adicionar um comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleAddComment}
              disabled={!comment.trim() || createInteraction.isPending}
            >
              {createInteraction.isPending ? "Enviando..." : "Enviar Comentário"}
            </Button>
          </div>

          <div className="space-y-4 pt-4">
            {interactions && interactions.length > 0 ? (
              interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex gap-3 p-4 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={interaction.profiles?.avatar_url} />
                    <AvatarFallback>
                      {interaction.profiles?.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {interaction.profiles?.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(interaction.created_at),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </span>
                    </div>
                    {interaction.content && (
                      <p className="text-sm whitespace-pre-wrap">
                        {interaction.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma interação ainda. Seja o primeiro a comentar!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
