import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { MentionText } from "@/components/MentionText";
import { useSharedDemand, useSharedDemandInteractions, useSharedDemandAttachments } from "@/hooks/useShareDemand";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, Users, Wrench, ExternalLink, Lock, MessageSquare, Kanban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { formatDemandCode } from "@/lib/demandCodeUtils";
import { cn } from "@/lib/utils";
import logoSoma from "@/assets/logo-soma.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { toast } from "sonner";

export default function SharedDemand() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: demand, isLoading, error } = useSharedDemand(token || null);
  const { data: interactions } = useSharedDemandInteractions(token || null, demand?.id || null);
  const { data: attachments } = useSharedDemandAttachments(token || null, demand?.id || null);

  // Redirect logged-in users to the full demand page
  useEffect(() => {
    if (!authLoading && user && demand?.id) {
      toast.success("Você foi redirecionado para a visualização completa", {
        description: "Como você está logado e tem acesso ao quadro, pode interagir com esta demanda.",
      });
      navigate(`/demands/${demand.id}`, { replace: true });
    }
  }, [authLoading, user, demand?.id, navigate]);

  // Filter only comments for public view
  const comments = interactions?.filter(i => i.interaction_type === "comment") || [];

  // Format assignees for display
  const formattedAssignees = demand?.demand_assignees?.map((a: any) => ({
    id: a.user_id,
    full_name: a.profile?.full_name || "Usuário",
    avatar_url: a.profile?.avatar_url,
  })) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (error || !demand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Link inválido ou expirado</h2>
            <p className="text-muted-foreground">
              Este link de compartilhamento não é mais válido. Solicite um novo link ao responsável pela demanda.
            </p>
            <Button asChild>
              <Link to="/auth">Fazer login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSoma} alt="Logo" className="h-8" />
            <Badge variant="secondary" className="gap-1">
              <ExternalLink className="h-3 w-3" />
              Visualização Pública
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth">
              <Lock className="mr-2 h-4 w-4" />
              Fazer login
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Modo de visualização:</strong> Você está visualizando esta demanda através de um link de compartilhamento. 
            Para editar ou interagir, faça login no sistema.
          </div>
        </div>

        {/* Demand Card */}
        <Card>
          <CardHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {demand.board_sequence_number && (
                  <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/20 font-mono">
                    {formatDemandCode(demand.board_sequence_number)}
                  </Badge>
                )}
                {demand.demand_statuses && (
                  <Badge 
                    style={{
                      backgroundColor: `${demand.demand_statuses.color}20`,
                      borderColor: `${demand.demand_statuses.color}40`,
                      color: demand.demand_statuses.color
                    }}
                    className="gap-1"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: demand.demand_statuses.color }} 
                    />
                    {demand.demand_statuses.name}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl md:text-2xl">{demand.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {demand.priority && <Badge variant="outline">{demand.priority}</Badge>}
                {demand.teams && <Badge variant="secondary">{demand.teams.name}</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            {demand.description && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Descrição</h3>
                <RichTextDisplay 
                  content={demand.description} 
                  className="text-sm text-muted-foreground" 
                />
              </div>
            )}

            {/* Details Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {demand.due_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span className="font-medium">
                    {formatDateOnlyBR(demand.due_date)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Serviço:</span>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  demand.services?.name 
                    ? "bg-primary/5 text-primary border-primary/20" 
                    : "bg-muted/50 text-muted-foreground border-muted-foreground/20"
                )}>
                  {demand.services?.name || "Nenhum serviço"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Responsáveis:</span>
                {formattedAssignees.length > 0 ? (
                  <div className="flex -space-x-2">
                    {formattedAssignees.slice(0, 3).map((assignee: any) => (
                      <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={assignee.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {assignee.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {formattedAssignees.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                        +{formattedAssignees.length - 3}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Nenhum</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Criada em:</span>
                <span className="font-medium">
                  {format(new Date(demand.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Anexos</h3>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment: any) => (
                    <a
                      key={attachment.id}
                      href={supabase.storage.from("demand-attachments").getPublicUrl(attachment.file_path).data.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {attachment.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        {comments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentários ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {comment.profiles?.full_name || "Usuário"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <MentionText text={comment.content || ""} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Visualização pública gerada pelo sistema de gestão de demandas</p>
        </div>
      </main>
    </div>
  );
}
