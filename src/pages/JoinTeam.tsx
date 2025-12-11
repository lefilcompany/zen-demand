import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTeamByAccessCode, useCreateJoinRequest, useExistingRequest } from "@/hooks/useTeamJoinRequests";
import { ArrowLeft, Users, Clock, CheckCircle, XCircle, Loader2, KeyRound, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoSoma from "@/assets/logo-soma.png";

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
            description: "Aguarde a aprovação do administrador da equipe.",
          });
          await supabase.auth.signOut();
          navigate("/auth");
        },
        onError: (error: any) => {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("duplicate") || msg.includes("unique")) {
            toast.warning("Você já possui uma solicitação pendente para esta equipe.");
          } else {
            toast.error("Erro ao enviar solicitação", {
              description: error.message || "Ocorreu um erro inesperado.",
            });
          }
        },
      }
    );
  };

  const getStatusBadge = () => {
    if (!existingRequest) return null;

    const statusConfig = {
      pending: {
        icon: Clock,
        text: "Solicitação pendente - aguardando aprovação",
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      },
      approved: {
        icon: CheckCircle,
        text: "Solicitação aprovada - você já é membro!",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      },
      rejected: {
        icon: XCircle,
        text: "Solicitação rejeitada",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      },
    };

    const config = statusConfig[existingRequest.status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.className}`}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium">{config.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar to-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-xl">
        {/* Main Card */}
        <div className="bg-background/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,hsl(var(--primary)/0.15),transparent_50%)]" />
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/welcome")}
                className="absolute -top-2 -left-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              
              <div className="text-center pt-6">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4">
                  <KeyRound className="h-8 w-8" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Entrar em Equipe
                </h1>
                <p className="text-muted-foreground">
                  Digite o código de acesso para encontrar a equipe
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Access Code Input */}
            <div className="space-y-3">
              <Label htmlFor="accessCode" className="text-base font-medium">
                Código de Acesso
              </Label>
              <div className="relative">
                <Input
                  id="accessCode"
                  placeholder="Digite o código de 10 caracteres"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="h-14 text-lg font-mono tracking-[0.3em] uppercase text-center bg-muted/50 border-2 focus:border-primary transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  {accessCode.length}/10
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingTeam && accessCode.length === 10 && (
              <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Buscando equipe...</span>
              </div>
            )}

            {/* Not Found State */}
            {!isLoadingTeam && accessCode.length === 10 && !teamPreview && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                <XCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">Nenhuma equipe encontrada com este código</span>
              </div>
            )}

            {/* Team Preview */}
            {teamPreview && (
              <div className="animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/20 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                          Equipe Encontrada
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground truncate">
                        {teamPreview.name}
                      </h3>
                      {teamPreview.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {teamPreview.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isLoadingRequest && existingRequest && (
                    <div className="mt-4">{getStatusBadge()}</div>
                  )}
                </div>
              </div>
            )}

            {/* Request Form */}
            {teamPreview && !existingRequest && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-bottom-4 duration-300 delay-100">
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-base font-medium">
                    Mensagem para o administrador
                    <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Apresente-se ou explique por que deseja entrar na equipe..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="resize-none bg-muted/50 border-2 focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/welcome")}
                    className="flex-1 h-12"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRequest.isPending}
                    className="flex-1 h-12 gap-2"
                  >
                    {createRequest.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Solicitar Entrada
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Back Button for existing request */}
            {teamPreview && existingRequest && (
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-12"
              >
                Voltar ao Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-muted-foreground/60 text-sm mt-6">
          O código de acesso é fornecido pelo administrador da equipe
        </p>
      </div>
    </div>
  );
}
