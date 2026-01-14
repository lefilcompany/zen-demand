import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyDemandRequests, useUpdateDemandRequest, useDeleteDemandRequest } from "@/hooks/useDemandRequests";
import { useRequestAttachments } from "@/hooks/useRequestAttachments";
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw, Edit, Trash2, Plus, Layout, CalendarIcon, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceSelector } from "@/components/ServiceSelector";
import { RequestAttachmentUploader } from "@/components/RequestAttachmentUploader";
import { RequestAttachmentBadge } from "@/components/RequestAttachmentBadge";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { getErrorMessage } from "@/lib/errorUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";


const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
  approved: { label: "Aprovada", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" },
  rejected: { label: "Rejeitada", icon: XCircle, color: "bg-destructive/20 text-destructive border-destructive/30" },
  returned: { label: "Devolvida", icon: RotateCcw, color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
};

const statusTabs = [
  { value: "all", label: "Todas", icon: null },
  { value: "pending", label: "Pendentes", icon: Clock },
  { value: "approved", label: "Aprovadas", icon: CheckCircle },
  { value: "returned", label: "Devolvidas", icon: RotateCcw },
  { value: "rejected", label: "Rejeitadas", icon: XCircle },
];

export default function MyDemandRequests() {
  const navigate = useNavigate();
  const { currentBoard, selectedBoardId } = useSelectedBoard();
  const { data: requests, isLoading } = useMyDemandRequests();
  const updateRequest = useUpdateDemandRequest();
  const deleteRequest = useDeleteDemandRequest();

  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("média");
  const [serviceId, setServiceId] = useState("");

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const openEditDialog = (request: any) => {
    setEditingRequest(request);
    setTitle(request.title);
    setDescription(request.description || "");
    setPriority(request.priority || "média");
    setServiceId(request.service_id || "");
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest || !title.trim()) return;

    updateRequest.mutate(
      {
        id: editingRequest.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        service_id: serviceId && serviceId !== "none" ? serviceId : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Solicitação reenviada com sucesso!");
          setEditingRequest(null);
        },
        onError: (error: any) => {
          toast.error("Erro ao reenviar", { description: getErrorMessage(error) });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;
    
    deleteRequest.mutate(id, {
      onSuccess: () => toast.success("Solicitação excluída"),
      onError: (error: any) => toast.error("Erro ao excluir", { description: getErrorMessage(error) }),
    });
  };

  const clearDateFilter = () => {
    setSelectedDate(undefined);
  };

  const hasDateFilter = !!selectedDate;

  // Count requests per status for tabs
  const statusCounts = useMemo(() => {
    if (!requests) return {};
    const counts: Record<string, number> = { all: requests.length };
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    return requests.filter((request) => {
      // Status filter
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      
      // Date filter - shows requests from selected date
      if (selectedDate) {
        const requestDate = new Date(request.created_at);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        if (isBefore(requestDate, start) || isAfter(requestDate, end)) {
          return false;
        }
      }
      
      return true;
    });
  }, [requests, statusFilter, selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Solicitações</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Quadro: <span className="font-medium">{currentBoard?.name || "Selecione um quadro"}</span>
          </p>
        </div>
        <Button onClick={() => navigate("/demands/request")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-muted/50 p-1.5 rounded-lg">
          {statusTabs.map((tab) => {
            const TabIcon = tab.icon;
            const count = statusCounts[tab.value] || 0;
            const isActive = statusFilter === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "gap-2 px-4 py-2 rounded-md transition-all duration-200",
                  "hover:bg-background/80 hover:shadow-sm",
                  "data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary"
                )}
              >
                {TabIcon && <TabIcon className={cn("h-4 w-4", isActive && "text-primary")} />}
                <span className="font-medium">{tab.label}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-1 h-5 min-w-5 px-1.5 text-xs font-semibold transition-colors",
                    isActive 
                      ? "bg-primary/15 text-primary" 
                      : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 transition-all",
                selectedDate && "border-primary bg-primary/5 text-primary"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {hasDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateFilter}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredRequests.length > 0 ? (
        <div className="grid gap-4">
          {filteredRequests.map((request) => {
            const status = statusConfig[request.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            const canEdit = request.status === "returned" || request.status === "pending";

            return (
              <Card key={request.id}>
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
                      <CardDescription>
                        Criada em {format(new Date(request.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge className={`${status.color} border`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {request.description && (
                    <RichTextDisplay content={request.description} className="text-sm text-muted-foreground mb-3" />
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant="outline">
                      Prioridade: {request.priority || "média"}
                    </Badge>
                    {request.service && (
                      <Badge variant="outline">
                        Serviço: {request.service.name}
                      </Badge>
                    )}
                    <RequestAttachmentBadge requestId={request.id} />
                  </div>

                  {request.rejection_reason && (
                    <div className="p-3 rounded-md bg-muted mb-3">
                      <p className="text-sm font-medium mb-1">
                        {request.status === "returned" ? "Motivo da devolução:" : "Motivo da rejeição:"}
                      </p>
                      <RichTextDisplay content={request.rejection_reason || ""} className="text-sm text-muted-foreground" />
                      {request.responder && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Por{" "}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/${request.responded_by}`);
                            }}
                            className="font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {request.responder.full_name}
                          </button>
                          {" "}em{" "}
                          {request.responded_at && format(new Date(request.responded_at), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      )}
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(request)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {request.status === "returned" ? "Editar e Reenviar" : "Editar"}
                      </Button>
                      {request.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(request.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {(statusFilter !== "all" || hasDateFilter) ? (
              <>
                <p>Nenhuma solicitação encontrada com os filtros aplicados</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => {
                    setStatusFilter("all");
                    clearDateFilter();
                  }}
                >
                  Limpar Filtros
                </Button>
              </>
            ) : (
              <>
                <p>Você ainda não tem solicitações neste quadro</p>
                <Button className="mt-4" onClick={() => navigate("/demands/request")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Solicitação
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit/Resubmit Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRequest?.status === "returned" ? "Editar e Reenviar Solicitação" : "Editar Solicitação"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                minHeight="100px"
                placeholder="Descreva sua solicitação..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Prioridade</Label>
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
                  teamId={editingRequest?.team_id}
                  boardId={editingRequest?.board_id || selectedBoardId}
                  value={serviceId}
                  onChange={setServiceId}
                />
              </div>
            </div>

            {/* Attachments Section */}
            {editingRequest && (
              <div className="border-t pt-4">
                <RequestAttachmentUploader requestId={editingRequest.id} />
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingRequest(null)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={updateRequest.isPending} className="flex-1">
                {updateRequest.isPending ? "Salvando..." : editingRequest?.status === "returned" ? "Reenviar" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
