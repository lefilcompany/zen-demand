import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTeamJoinRequests, useRespondToRequest, ExtendedTeamRole } from "@/hooks/useTeamJoinRequests";
import { useIsTeamAdmin } from "@/hooks/useTeamRole";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ArrowLeft, Clock, CheckCircle, XCircle, UserPlus, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const roleOptions: { value: ExtendedTeamRole; label: string; description: string }[] = [
  {
    value: "moderator",
    label: "Coordenador",
    description: "Gerencia demandas, serviços e aprova solicitações",
  },
  {
    value: "executor",
    label: "Agente",
    description: "Visualiza, executa demandas e atualiza o Kanban",
  },
  {
    value: "requester",
    label: "Solicitante",
    description: "Apenas cria demandas e acompanha o progresso (Kanban somente leitura)",
  },
];

export default function TeamRequests() {
  const navigate = useNavigate();
  const { id: teamId } = useParams<{ id: string }>();
  const { selectedTeamId } = useSelectedTeam();
  const effectiveTeamId = teamId || selectedTeamId;

  const { data: requests, isLoading } = useTeamJoinRequests(effectiveTeamId);
  const { isAdmin, isLoading: isLoadingRole } = useIsTeamAdmin(effectiveTeamId);
  const respondToRequest = useRespondToRequest();

  const [selectedRequest, setSelectedRequest] = useState<NonNullable<typeof requests>[number] | null>(null);
  const [selectedRole, setSelectedRole] = useState<ExtendedTeamRole>("requester");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const handleApprove = () => {
    if (!selectedRequest || !effectiveTeamId) return;

    respondToRequest.mutate(
      {
        requestId: selectedRequest.id,
        teamId: effectiveTeamId,
        userId: selectedRequest.user_id,
        status: "approved",
        role: selectedRole,
      },
      {
        onSuccess: () => {
          toast.success("Solicitação aprovada!", {
            description: `Novo membro adicionado como ${roleOptions.find((r) => r.value === selectedRole)?.label}.`,
          });
          setIsApproveDialogOpen(false);
          setSelectedRequest(null);
        },
        onError: (error: any) => {
          toast.error("Erro ao aprovar solicitação", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  const handleReject = (request: NonNullable<typeof requests>[number]) => {
    if (!effectiveTeamId) return;

    respondToRequest.mutate(
      {
        requestId: request.id,
        teamId: effectiveTeamId,
        userId: request.user_id,
        status: "rejected",
      },
      {
        onSuccess: () => {
          toast.success("Solicitação rejeitada.");
        },
        onError: (error: any) => {
          toast.error("Erro ao rejeitar solicitação", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  const openApproveDialog = (request: NonNullable<typeof requests>[number]) => {
    setSelectedRequest(request);
    setSelectedRole("requester");
    setIsApproveDialogOpen(true);
  };

  if (isLoadingRole) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>Você não tem permissão para acessar esta página.</p>
                <p className="text-sm mt-2">Apenas administradores podem gerenciar solicitações.</p>
              </div>
            </CardContent>
          </Card>
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
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Solicitações de Entrada</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de novos membros para sua equipe
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {request.profiles?.full_name || "Usuário"}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(request.requested_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>

                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          "{request.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request)}
                        disabled={respondToRequest.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openApproveDialog(request)}
                        disabled={respondToRequest.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhuma solicitação pendente</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Quando alguém solicitar entrada na equipe, aparecerá aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar Solicitação</DialogTitle>
              <DialogDescription>
                Selecione o papel que {selectedRequest?.profiles?.full_name || "o usuário"} terá na equipe.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label className="text-base">Papel na Equipe</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as ExtendedTeamRole)}
                className="mt-3 space-y-3"
              >
                {roleOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRole(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleApprove} disabled={respondToRequest.isPending}>
                {respondToRequest.isPending ? "Aprovando..." : "Confirmar Aprovação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
