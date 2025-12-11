import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTeamByAccessCode, useCreateJoinRequest, useExistingRequest } from "@/hooks/useTeamJoinRequests";
import { ArrowLeft, Users, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function JoinTeam() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState("");

  const { data: teamPreview, isLoading: isLoadingTeam } = useTeamByAccessCode(accessCode);
  const { data: existingRequest, isLoading: isLoadingRequest } = useExistingRequest(teamPreview?.id || null);
  const createRequest = useCreateJoinRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamPreview) return;

    createRequest.mutate(
      { teamId: teamPreview.id, message: message.trim() || undefined },
      {
        onSuccess: async () => {
          toast.success("Solicitação enviada com sucesso!", {
            description: "Aguarde a aprovação do administrador da equipe. Você será notificado quando sua solicitação for analisada.",
          });
          // Logout silencioso e redirecionar para login
          await supabase.auth.signOut();
          navigate("/auth");
        },
        onError: (error: any) => {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("duplicate") || msg.includes("unique")) {
            toast.warning("Você já possui uma solicitação pendente para esta equipe.");
          } else {
            toast.error("Erro ao enviar solicitação", {
              description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
            });
          }
        },
      }
    );
  };

  const getStatusBadge = () => {
    if (!existingRequest) return null;

    switch (existingRequest.status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            <Clock className="h-4 w-4" />
            <span>Solicitação pendente - aguardando aprovação</span>
          </div>
        );
      case "approved":
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span>Solicitação aprovada - você já é membro!</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <XCircle className="h-4 w-4" />
            <span>Solicitação rejeitada</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-sidebar p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/welcome")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Entrar em Equipe</h1>
          <p className="text-muted-foreground">
            Use o código de acesso para solicitar entrada em uma equipe
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Código de Acesso</CardTitle>
            <CardDescription>
              Digite o código de 10 caracteres fornecido pelo administrador da equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Código de Acesso *</Label>
              <Input
                id="accessCode"
                placeholder="Ex: ABC1234XYZ"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="uppercase font-mono text-lg tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                O código deve ter 10 caracteres
              </p>
            </div>

            {isLoadingTeam && accessCode.length === 10 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Buscando equipe...</span>
              </div>
            )}

            {!isLoadingTeam && accessCode.length === 10 && !teamPreview && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span>Nenhuma equipe encontrada com este código</span>
              </div>
            )}

            {teamPreview && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{teamPreview.name}</h3>
                      {teamPreview.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {teamPreview.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isLoadingRequest && existingRequest && (
                    <div className="mt-4">{getStatusBadge()}</div>
                  )}
                </CardContent>
              </Card>
            )}

            {teamPreview && !existingRequest && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Apresente-se ou explique por que deseja entrar na equipe..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRequest.isPending}
                    className="flex-1"
                  >
                    {createRequest.isPending ? "Enviando..." : "Solicitar Entrada"}
                  </Button>
                </div>
              </form>
            )}

            {teamPreview && existingRequest && (
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
