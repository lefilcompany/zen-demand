import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useDemands, useDemandInteractions, useCreateInteraction } from "@/hooks/useDemands";
import { ArrowLeft, Calendar, User, MessageSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function DemandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: demands } = useDemands();
  const { data: interactions } = useDemandInteractions(id!);
  const createInteraction = useCreateInteraction();
  const [comment, setComment] = useState("");

  const demand = demands?.find((d) => d.id === id);

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
          setComment("");
        },
      }
    );
  };

  if (!demand) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Demanda não encontrada</p>
          <Button onClick={() => navigate("/demands")} className="mt-4">
            Voltar para Demandas
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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

              {demand.assigned_profile && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Atribuído a:</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={demand.assigned_profile.avatar_url} />
                      <AvatarFallback>
                        {demand.assigned_profile.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {demand.assigned_profile.full_name}
                    </span>
                  </div>
                </div>
              )}
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
    </Layout>
  );
}
