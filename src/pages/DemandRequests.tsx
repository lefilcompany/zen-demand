import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePendingDemandRequests, useApproveDemandRequest, useReturnDemandRequest } from "@/hooks/useDemandRequests";
import { ArrowLeft, Clock, CheckCircle, RotateCcw, Users, Layout, Paperclip, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { addDays } from "date-fns";
import { getErrorMessage } from "@/lib/errorUtils";
import { RequestAttachmentBadge } from "@/components/RequestAttachmentBadge";
import { RequestAttachmentUploader } from "@/components/RequestAttachmentUploader";

const priorityColors: Record<string, string> = {
  baixa: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  média: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  alta: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function DemandRequests() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId, currentBoard } = useSelectedBoard();
  const { data: requests, isLoading } = usePendingDemandRequests();
  const approveRequest = useApproveDemandRequest();
  const returnRequest = useReturnDemandRequest();

  const [viewing, setViewing] = useState<any | null>(null);
  const [approving, setApproving] = useState<any | null>(null);
  const [returning, setReturning] = useState<any | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const openApproveDialog = (request: any) => {
    setApproving(request);
    setAssigneeIds([]);
    // Calculate due date based on service
    if (request.service?.estimated_days) {
      const calculated = addDays(new Date(), request.service.estimated_days);
      setDueDate(format(calculated, "yyyy-MM-dd"));
    } else {
      setDueDate("");
    }
  };

  const handleApprove = async () => {
    if (!approving) return;

    approveRequest.mutate(
      {
        requestId: approving.id,
        assigneeIds,
        dueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Demanda criada com sucesso!");
          setApproving(null);
        },
        onError: (error: any) => {
          toast.error("Erro ao aprovar", { description: getErrorMessage(error) });
        },
      }
    );
  };

  const handleReturn = async () => {
    if (!returning || !returnReason.trim()) return;

    returnRequest.mutate(
      {
        requestId: returning.id,
        reason: returnReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Solicitação devolvida ao solicitante");
          setReturning(null);
          setReturnReason("");
        },
        onError: (error: any) => {
          toast.error("Erro ao devolver", { description: getErrorMessage(error) });
        },
      }
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Solicitações de Demanda</h1>
        <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
          <Layout className="h-4 w-4 shrink-0" />
          <span className="truncate">Quadro: <span className="font-medium">{currentBoard?.name || "Selecione um quadro"}</span></span>
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : requests && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card 
              key={request.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewing(request)}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Layout className="h-3 w-3 mr-1" />
                        {request.board?.name || "Quadro"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={request.creator?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(request.creator?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      {request.creator?.full_name} •{" "}
                      {format(new Date(request.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-700 border border-yellow-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {request.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{request.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${priorityColors[request.priority || "média"]} border`}>
                    Prioridade: {request.priority || "média"}
                  </Badge>
                  {request.service && (
                    <Badge variant="outline">
                      {request.service.name} ({request.service.estimated_hours}h)
                    </Badge>
                  )}
                  <RequestAttachmentBadge requestId={request.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Não há solicitações pendentes para este quadro</p>
          </CardContent>
        </Card>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Layout className="h-3 w-3 mr-1" />
                {viewing?.board?.name || "Quadro"}
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-700 border border-yellow-500/30">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            </div>
            <DialogTitle className="text-xl">{viewing?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={viewing?.creator?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(viewing?.creator?.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              <span>
                {viewing?.creator?.full_name} •{" "}
                {viewing && format(new Date(viewing.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Priority and Service */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${priorityColors[viewing?.priority || "média"]} border`}>
                Prioridade: {viewing?.priority || "média"}
              </Badge>
              {viewing?.service && (
                <Badge variant="outline">
                  {viewing.service.name} ({viewing.service.estimated_hours}h)
                </Badge>
              )}
            </div>

            {/* Description */}
            {viewing?.description && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Descrição</Label>
                <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">
                  {viewing.description}
                </div>
              </div>
            )}

            {/* Attachments */}
            {viewing && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Paperclip className="h-4 w-4" />
                  Anexos
                </Label>
                <div className="border rounded-lg p-3">
                  <RequestAttachmentUploader requestId={viewing.id} readOnly />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewing(null);
                  openApproveDialog(viewing);
                }}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar e Criar Demanda
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewing(null);
                  setReturning(viewing);
                }}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Devolver para Revisão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={!!approving} onOpenChange={() => setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>
              Configure os responsáveis e a data de vencimento para criar a demanda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-md bg-muted">
              <p className="font-medium">{approving?.title}</p>
              {approving?.description && (
                <p className="text-sm text-muted-foreground mt-1">{approving.description}</p>
              )}
            </div>

            {/* Show attachments */}
            {approving && (
              <div className="border rounded-lg p-3">
                <RequestAttachmentUploader requestId={approving.id} readOnly />
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Responsáveis
              </Label>
              <AssigneeSelector
                teamId={selectedTeamId}
                boardId={selectedBoardId}
                selectedUserIds={assigneeIds}
                onChange={setAssigneeIds}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {approving?.service && (
                <p className="text-xs text-muted-foreground">
                  Sugestão baseada no serviço: {approving.service.estimated_days} dias
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setApproving(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleApprove} disabled={approveRequest.isPending} className="flex-1">
                {approveRequest.isPending ? "Criando..." : "Aprovar e Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returning} onOpenChange={() => setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo para devolver a solicitação ao solicitante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted">
              <p className="font-medium">{returning?.title}</p>
            </div>

            <div className="space-y-2">
              <Label>Motivo da devolução *</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Descreva os ajustes necessários..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setReturning(null)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleReturn}
                disabled={returnRequest.isPending || !returnReason.trim()}
                className="flex-1"
              >
                {returnRequest.isPending ? "Enviando..." : "Devolver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
