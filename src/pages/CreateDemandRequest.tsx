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
import { useUploadRequestAttachment } from "@/hooks/useRequestAttachments";
import { ServiceSelector } from "@/components/ServiceSelector";
import { RequestAttachmentUploader } from "@/components/RequestAttachmentUploader";
import { PendingFileUploader, PendingFile } from "@/components/PendingFileUploader";
import { ArrowLeft, Ban, Send, Layout, Paperclip, Loader2 } from "lucide-react";
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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  
  const uploadAttachment = useUploadRequestAttachment();

  const handleServiceChange = (newServiceId: string) => {
    setServiceId(newServiceId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !selectedTeamId || !selectedBoardId || !isTeamActive || !serviceId || serviceId === "none") return;

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
        onSuccess: async (data) => {
          // Upload pending files
          if (pendingFiles.length > 0) {
            setIsUploading(true);
            try {
              for (const pf of pendingFiles) {
                await uploadAttachment.mutateAsync({ requestId: data.id, file: pf.file });
              }
              // Clean up previews
              pendingFiles.forEach((pf) => {
                if (pf.preview) URL.revokeObjectURL(pf.preview);
              });
              setPendingFiles([]);
            } catch (error) {
              toast.error("Alguns arquivos não foram enviados");
            } finally {
              setIsUploading(false);
            }
          }
          
          setCreatedRequestId(data.id);
          toast.success("Solicitação criada!", {
            description: "Agora você pode adicionar mais anexos se desejar.",
          });
        },
        onError: (error: any) => {
          toast.error("Erro ao enviar solicitação", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleFinish = () => {
    toast.success("Solicitação enviada com sucesso!", {
      description: "Aguarde a aprovação de um administrador ou coordenador.",
    });
    navigate("/my-requests");
  };

  // If request was created, show attachment step
  if (createdRequestId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Adicionar Anexos</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Adicione arquivos à sua solicitação (opcional)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Anexos
            </CardTitle>
            <CardDescription>
              Anexe documentos, imagens ou outros arquivos relevantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RequestAttachmentUploader requestId={createdRequestId} />

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleFinish}
                className="flex-1"
              >
                Pular
              </Button>
              <Button onClick={handleFinish} className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                Concluir Solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-1">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2 md:mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Solicitar Demanda</h1>
        <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
          <Layout className="h-4 w-4 shrink-0" />
          <span className="truncate">Quadro: <span className="font-medium text-primary">{currentBoard?.name || "Selecione um quadro"}</span></span>
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
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva os detalhes do que você precisa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
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
                <Label>Serviço *</Label>
                <ServiceSelector
                  teamId={selectedTeamId}
                  boardId={selectedBoardId}
                  value={serviceId}
                  onChange={handleServiceChange}
                />
              </div>
            </div>

            {/* Anexos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos (opcional)
              </Label>
              <PendingFileUploader
                files={pendingFiles}
                onFilesChange={setPendingFiles}
                disabled={createRequest.isPending || isUploading}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(-1);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRequest.isPending || isUploading || !title.trim() || !description.trim() || !isTeamActive || !selectedBoardId || !serviceId || serviceId === "none"}
                className="flex-1"
              >
                {(createRequest.isPending || isUploading) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Enviando anexos..." : createRequest.isPending ? "Criando..." : "Avançar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
