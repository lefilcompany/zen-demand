import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useTeamScope } from "@/hooks/useTeamScope";
import { useCreateDemandRequest } from "@/hooks/useDemandRequests";
import { ServiceSelector } from "@/components/ServiceSelector";
import { ArrowLeft, Ban, Send, Layout } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";

export default function CreateDemandRequest() {
  const navigate = useNavigate();
  const createRequest = useCreateDemandRequest();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId, currentBoard } = useSelectedBoard();
  const { data: scope } = useTeamScope();

  const isTeamActive = scope?.active ?? true;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("média");
  const [serviceId, setServiceId] = useState("");

  const handleServiceChange = (newServiceId: string) => {
    setServiceId(newServiceId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTeamId || !selectedBoardId || !isTeamActive) return;

    createRequest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        team_id: selectedTeamId,
        board_id: selectedBoardId,
        priority,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Solicitação enviada com sucesso!", {
            description: "Aguarde a aprovação de um administrador ou coordenador.",
          });
          navigate("/my-requests");
        },
        onError: (error: any) => {
          toast.error("Erro ao enviar solicitação", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Solicitar Demanda</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Layout className="h-4 w-4" />
          Quadro: <span className="font-medium text-primary">{currentBoard?.name || "Selecione um quadro"}</span>
        </p>
      </div>

      {/* Team Inactive Alert */}
      {!isTeamActive && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertDescription>
            O contrato desta equipe está inativo. Não é possível enviar novas solicitações.
          </AlertDescription>
        </Alert>
      )}

      {/* No Board Selected Alert */}
      {!selectedBoardId && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertDescription>
            Selecione um quadro para enviar uma solicitação.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações da Solicitação</CardTitle>
          <CardDescription>
            Descreva a demanda que você precisa. Um administrador ou coordenador irá revisar e aprovar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Desenvolver nova funcionalidade"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva os detalhes do que você precisa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="média">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <ServiceSelector
                  teamId={selectedTeamId}
                  boardId={selectedBoardId}
                  value={serviceId}
                  onChange={handleServiceChange}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRequest.isPending || !title.trim() || !isTeamActive || !selectedBoardId}
                className="flex-1"
              >
                <Send className="mr-2 h-4 w-4" />
                {createRequest.isPending ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
