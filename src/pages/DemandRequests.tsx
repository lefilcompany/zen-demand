import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  usePendingDemandRequests, 
  useApprovedDemandRequests,
  useReturnedDemandRequests,
  useApproveDemandRequest, 
  useReturnDemandRequest,
  useMyDemandRequests,
  useUpdateDemandRequest,
  useDeleteDemandRequest
} from "@/hooks/useDemandRequests";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Clock, CheckCircle, RotateCcw, Users, Layout, Paperclip, MessageSquare, Send, Trash2, XCircle, ChevronLeft, ChevronRight, ClipboardList, Edit, Plus, CalendarIcon, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssigneeSelector } from "@/components/AssigneeSelector";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { calculateBusinessDueDate, formatDueDateForInput } from "@/lib/dateUtils";
import { getErrorMessage } from "@/lib/errorUtils";
import { RequestAttachmentBadge } from "@/components/RequestAttachmentBadge";
import { RequestAttachmentUploader } from "@/components/RequestAttachmentUploader";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useRequestComments, useCreateRequestComment, useDeleteRequestComment } from "@/hooks/useRequestComments";
import { MentionInput } from "@/components/MentionInput";
import { MentionText } from "@/components/MentionText";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { useUploadRequestAttachment } from "@/hooks/useRequestAttachments";
import { CommentAttachmentUploader } from "@/components/CommentAttachmentUploader";
import { CommentAttachments } from "@/components/CommentAttachments";
import { ServiceSelector } from "@/components/ServiceSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useTeamMembershipRole } from "@/hooks/useTeamRole";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  baixa: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  média: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  alta: "bg-destructive/20 text-destructive border-destructive/30"
};

export default function DemandRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId, currentBoard } = useSelectedBoard();
  const { data: boardRole } = useBoardRole(selectedBoardId);
  const { data: teamMembershipRole } = useTeamMembershipRole(selectedTeamId);
  
  const isRequester = boardRole === "requester" || (!boardRole && teamMembershipRole === "requester");
  const canApproveOrReturn = boardRole === "admin" || boardRole === "moderator";
  
  // Fetch all types of requests
  const { data: pendingRequests, isLoading: pendingLoading } = usePendingDemandRequests();
  const { data: approvedRequests, isLoading: approvedLoading } = useApprovedDemandRequests();
  const { data: returnedRequests, isLoading: returnedLoading } = useReturnedDemandRequests();
  
  // My requests (for requester tab)
  const { data: myRequests, isLoading: myLoading } = useMyDemandRequests();
  
  const approveRequest = useApproveDemandRequest();
  const returnRequest = useReturnDemandRequest();
  const updateRequest = useUpdateDemandRequest();
  const deleteRequest = useDeleteDemandRequest();
  
  // Determine default tab based on role
  const defaultTab = isRequester ? "mine" : "pending";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [viewing, setViewing] = useState<any | null>(null);
  const [approving, setApproving] = useState<any | null>(null);
  const [returning, setReturning] = useState<any | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [commentText, setCommentText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Edit dialog state (for requester editing own requests)
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("média");
  const [editServiceId, setEditServiceId] = useState("");

  // My requests filters
  const [myStatusFilter, setMyStatusFilter] = useState<string>("all");
  const [mySelectedDate, setMySelectedDate] = useState<Date | undefined>();

  // Pagination states
  const [approvedPage, setApprovedPage] = useState(1);
  const [returnedPage, setReturnedPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Update default tab when role changes
  useEffect(() => {
    if (isRequester && activeTab === "pending" && !canApproveOrReturn) {
      setActiveTab("mine");
    }
  }, [isRequester, canApproveOrReturn]);

  // Handle highlight param - auto-open a specific request
  const highlightId = searchParams.get("highlight");
  useEffect(() => {
    if (!highlightId) return;
    
    // Search in all request lists
    const allRequests = [
      ...(pendingRequests || []),
      ...(approvedRequests || []),
      ...(returnedRequests || []),
      ...(myRequests || []),
    ];
    
    const found = allRequests.find((r: any) => r.id === highlightId);
    if (found) {
      setViewing(found);
      // Clear the highlight param
      searchParams.delete("highlight");
      setSearchParams(searchParams, { replace: true });
    }
  }, [highlightId, pendingRequests, approvedRequests, returnedRequests, myRequests]);

  // All board requests combined (for requester "Todas do Quadro" tab)
  const allBoardRequests = useMemo(() => {
    return [
      ...(pendingRequests || []),
      ...(approvedRequests || []),
      ...(returnedRequests || []),
    ];
  }, [pendingRequests, approvedRequests, returnedRequests]);

  const [allBoardPage, setAllBoardPage] = useState(1);

  const paginatedAllBoard = useMemo(() => {
    const totalPages = Math.ceil(allBoardRequests.length / ITEMS_PER_PAGE);
    const startIndex = (allBoardPage - 1) * ITEMS_PER_PAGE;
    const items = allBoardRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    return { items, totalPages };
  }, [allBoardRequests, allBoardPage]);

  // Paginated data
  const paginatedApproved = useMemo(() => {
    if (!approvedRequests) return { items: [], totalPages: 0 };
    const totalPages = Math.ceil(approvedRequests.length / ITEMS_PER_PAGE);
    const startIndex = (approvedPage - 1) * ITEMS_PER_PAGE;
    const items = approvedRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    return { items, totalPages };
  }, [approvedRequests, approvedPage]);

  const paginatedReturned = useMemo(() => {
    if (!returnedRequests) return { items: [], totalPages: 0 };
    const totalPages = Math.ceil(returnedRequests.length / ITEMS_PER_PAGE);
    const startIndex = (returnedPage - 1) * ITEMS_PER_PAGE;
    const items = returnedRequests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    return { items, totalPages };
  }, [returnedRequests, returnedPage]);

  // My requests filtered
  const myStatusCounts = useMemo(() => {
    if (!myRequests) return {};
    const counts: Record<string, number> = { all: myRequests.length };
    myRequests.forEach((r: any) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [myRequests]);

  const filteredMyRequests = useMemo(() => {
    if (!myRequests) return [];
    return myRequests.filter((request: any) => {
      if (myStatusFilter !== "all" && request.status !== myStatusFilter) return false;
      if (mySelectedDate) {
        const requestDate = new Date(request.created_at);
        const start = startOfDay(mySelectedDate);
        const end = endOfDay(mySelectedDate);
        if (isBefore(requestDate, start) || isAfter(requestDate, end)) return false;
      }
      return true;
    });
  }, [myRequests, myStatusFilter, mySelectedDate]);

  // Comments hooks
  const { data: comments, isLoading: commentsLoading } = useRequestComments(viewing?.id || null);
  const createComment = useCreateRequestComment();
  const deleteComment = useDeleteRequestComment();
  const uploadAttachment = useUploadRequestAttachment();

  const openApproveDialog = (request: any) => {
    setApproving(request);
    setAssigneeIds([]);
    if (request.service?.estimated_hours) {
      const calculatedDate = calculateBusinessDueDate(request.service.estimated_hours);
      setDueDate(formatDueDateForInput(calculatedDate));
    } else {
      setDueDate("");
    }
  };

  const handleApprove = async () => {
    if (!approving) return;
    approveRequest.mutate({
      requestId: approving.id,
      assigneeIds,
      dueDate: dueDate || undefined
    }, {
      onSuccess: () => {
        toast.success("Demanda criada com sucesso!");
        setApproving(null);
        navigate("/demands");
      },
      onError: (error: any) => {
        toast.error("Erro ao aprovar", {
          description: getErrorMessage(error)
        });
      }
    });
  };

  const handleReturn = async () => {
    if (!returning || !returnReason.trim()) return;
    returnRequest.mutate({
      requestId: returning.id,
      reason: returnReason.trim()
    }, {
      onSuccess: () => {
        toast.success("Solicitação devolvida ao solicitante");
        setReturning(null);
        setReturnReason("");
      },
      onError: (error: any) => {
        toast.error("Erro ao devolver", {
          description: getErrorMessage(error)
        });
      }
    });
  };

  const handleAddComment = async () => {
    if (!viewing || !commentText.trim()) return;
    try {
      let content = commentText.trim();
      if (content.includes('data:image')) {
        try {
          const { uploadInlineImages } = await import("@/lib/imageUploadUtils");
          content = await uploadInlineImages(content);
        } catch (err) {
          console.error("Error uploading inline images:", err);
          content = content.replace(/<img\s+src="data:[^"]*"[^>]*\/?>/g, '[imagem não enviada]');
        }
      }
      
      const comment = await createComment.mutateAsync({
        requestId: viewing.id,
        content,
      });

      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          await uploadAttachment.mutateAsync({
            requestId: viewing.id,
            file,
            commentId: comment.id
          });
        }
      }

      setCommentText("");
      setPendingFiles([]);
      toast.success("Comentário adicionado");
    } catch (error: any) {
      toast.error("Erro ao adicionar comentário", {
        description: getErrorMessage(error)
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!viewing) return;
    deleteComment.mutate({
      commentId,
      requestId: viewing.id
    }, {
      onSuccess: () => {
        toast.success("Comentário removido");
      },
      onError: (error: any) => {
        toast.error("Erro ao remover comentário", {
          description: getErrorMessage(error)
        });
      }
    });
  };

  // Edit handlers for requester
  const openEditDialog = (request: any) => {
    setEditingRequest(request);
    setEditTitle(request.title);
    setEditDescription(request.description || "");
    setEditPriority(request.priority || "média");
    setEditServiceId(request.service_id || "");
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest || !editTitle.trim()) return;
    updateRequest.mutate(
      {
        id: editingRequest.id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        service_id: editServiceId && editServiceId !== "none" ? editServiceId : undefined,
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

  const handleDeleteRequest = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;
    deleteRequest.mutate(id, {
      onSuccess: () => toast.success("Solicitação excluída"),
      onError: (error: any) => toast.error("Erro ao excluir", { description: getErrorMessage(error) }),
    });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-700 border border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case "returned":
        return (
          <Badge className="bg-orange-500/20 text-orange-700 border border-orange-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Devolvida
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/20 text-destructive border border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitada
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-700 border border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const renderRequestCard = (request: any, showReapproveButton = false) => (
    <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewing(request)}>
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user/${request.created_by}`);
                }}
                className="hover:text-primary hover:underline cursor-pointer transition-colors"
              >
                {request.creator?.full_name}
              </button>
              {" "}•{" "}
              {format(new Date(request.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent>
        {request.description && (
          <RichTextDisplay content={request.description} className="text-sm text-muted-foreground mb-3 line-clamp-2" />
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

        {request.status === "returned" && request.rejection_reason && (
          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">Motivo da devolução:</p>
            <div className="text-sm text-muted-foreground">
              <RichTextDisplay content={request.rejection_reason} />
            </div>
          </div>
        )}

        {(request.status === "approved" || request.status === "returned") && request.responder && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
            <span>{request.status === "approved" ? "Aprovada" : "Devolvida"} por {request.responder.full_name}</span>
            {request.responded_at && (
              <span>em {format(new Date(request.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            )}
          </div>
        )}

        {showReapproveButton && canApproveOrReturn && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                openApproveDialog(request);
              }}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Reaprovar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render a "my request" card (requester view with edit/delete)
  const renderMyRequestCard = (request: any) => {
    const statusMap: Record<string, { label: string; icon: any; color: string }> = {
      pending: { label: "Pendente", icon: Clock, color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
      approved: { label: "Aprovada", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" },
      rejected: { label: "Rejeitada", icon: XCircle, color: "bg-destructive/20 text-destructive border-destructive/30" },
      returned: { label: "Devolvida", icon: RotateCcw, color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
    };
    const status = statusMap[request.status] || statusMap.pending;
    const StatusIcon = status.icon;
    const canEdit = request.status === "returned" || request.status === "pending";

    return (
      <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewing(request)}>
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
            <RichTextDisplay content={request.description} className="text-sm text-muted-foreground mb-3 line-clamp-2" />
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline">Prioridade: {request.priority || "média"}</Badge>
            {request.service && (
              <Badge variant="outline">Serviço: {request.service.name}</Badge>
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
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => openEditDialog(request)}>
                <Edit className="h-4 w-4 mr-1" />
                {request.status === "returned" ? "Editar e Reenviar" : "Editar"}
              </Button>
              {request.status === "pending" && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteRequest(request.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <p>{message}</p>
      </CardContent>
    </Card>
  );

  const renderPagination = (page: number, setPage: (fn: (p: number) => number) => void, totalPages: number) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-end">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const myStatusTabs = [
    { value: "all", label: "Todas", icon: null },
    { value: "pending", label: "Pendentes", icon: Clock },
    { value: "approved", label: "Aprovadas", icon: CheckCircle },
    { value: "returned", label: "Devolvidas", icon: RotateCcw },
    { value: "rejected", label: "Rejeitadas", icon: XCircle },
  ];

  const pageTitle = isRequester && !canApproveOrReturn ? "Minhas Solicitações" : "Solicitações de Demanda";

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <PageBreadcrumb
        items={[
          { label: pageTitle, icon: ClipboardList, isCurrent: true },
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
            <Layout className="h-4 w-4 shrink-0" />
            <span className="truncate">Quadro: <span className="font-medium">{currentBoard?.name || "Selecione um quadro"}</span></span>
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "w-full grid mb-4",
          isRequester && canApproveOrReturn ? "grid-cols-5" :
          isRequester ? "grid-cols-2" :
          canApproveOrReturn ? "grid-cols-3" : "grid-cols-1"
        )}>
          {isRequester && (
            <TabsTrigger value="mine" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Minhas</span>
              {myRequests && myRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{myRequests.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {isRequester && (
            <TabsTrigger value="all-board" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Todas do Quadro</span>
              {allBoardRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{allBoardRequests.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {(canApproveOrReturn || !isRequester) && (
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Pendentes</span>
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {canApproveOrReturn && (
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovadas</span>
              {approvedRequests && approvedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{approvedRequests.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {canApproveOrReturn && (
            <TabsTrigger value="returned" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Devolvidas</span>
              {returnedRequests && returnedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{returnedRequests.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* My Requests Tab (Requester) */}
        {isRequester && (
          <TabsContent value="mine">
            {/* Sub-filters for my requests */}
            <div className="space-y-4">
              <Tabs value={myStatusFilter} onValueChange={setMyStatusFilter} className="w-full">
                <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-muted/50 p-1.5 rounded-lg">
                  {myStatusTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const count = myStatusCounts[tab.value] || 0;
                    const isActive = myStatusFilter === tab.value;
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
                            isActive ? "bg-primary/15 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
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
                        mySelectedDate && "border-primary bg-primary/5 text-primary"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {mySelectedDate ? format(mySelectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={mySelectedDate} onSelect={setMySelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
                {mySelectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => setMySelectedDate(undefined)} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {myLoading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
              ) : filteredMyRequests.length > 0 ? (
                <div className="grid gap-4">
                  {filteredMyRequests.map((request: any) => renderMyRequestCard(request))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {(myStatusFilter !== "all" || mySelectedDate) ? (
                      <>
                        <p>Nenhuma solicitação encontrada com os filtros aplicados</p>
                        <Button variant="outline" className="mt-4" onClick={() => { setMyStatusFilter("all"); setMySelectedDate(undefined); }}>
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
            </div>
          </TabsContent>
        )}

        {/* All Board Requests Tab (Requester) */}
        {isRequester && (
          <TabsContent value="all-board">
            {(pendingLoading || approvedLoading || returnedLoading) ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : allBoardRequests.length > 0 ? (
              <div className="space-y-4">
                {paginatedAllBoard.totalPages > 1 && renderPagination(allBoardPage, setAllBoardPage, paginatedAllBoard.totalPages)}
                <div className="grid gap-4">
                  {paginatedAllBoard.items.map((request: any) => (
                    <Card
                      key={request.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setViewing(request)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{request.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {request.profiles?.full_name || "Usuário"}
                              </span>
                              <span>•</span>
                              <span>{format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={priorityColors[request.priority || "média"]}>
                              {request.priority || "média"}
                            </Badge>
                            <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                              {request.status === "pending" ? "Pendente" : request.status === "approved" ? "Aprovada" : "Devolvida"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {request.service?.name && (
                        <CardContent className="pt-0 pb-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            {request.service.name}
                          </span>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              renderEmptyState("Não há solicitações neste quadro")
            )}
          </TabsContent>
        )}

        {/* Pending Tab */}
        <TabsContent value="pending">
          {pendingLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <div className="grid gap-4">
              {pendingRequests.map(request => renderRequestCard(request))}
            </div>
          ) : (
            renderEmptyState("Não há solicitações pendentes para este quadro")
          )}
        </TabsContent>

        {canApproveOrReturn && (
          <TabsContent value="approved">
            {approvedLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : approvedRequests && approvedRequests.length > 0 ? (
              <div className="space-y-4">
                {renderPagination(approvedPage, setApprovedPage, paginatedApproved.totalPages)}
                <div className="grid gap-4">
                  {paginatedApproved.items.map(request => renderRequestCard(request))}
                </div>
              </div>
            ) : (
              renderEmptyState("Não há solicitações aprovadas para este quadro")
            )}
          </TabsContent>
        )}

        {canApproveOrReturn && (
          <TabsContent value="returned">
            {returnedLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : returnedRequests && returnedRequests.length > 0 ? (
              <div className="space-y-4">
                {renderPagination(returnedPage, setReturnedPage, paginatedReturned.totalPages)}
                <div className="grid gap-4">
                  {paginatedReturned.items.map(request => renderRequestCard(request, true))}
                </div>
              </div>
            ) : (
              renderEmptyState("Não há solicitações devolvidas para este quadro")
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="my-[4px]">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Layout className="h-3 w-3 mr-1" />
                {viewing?.board?.name || "Quadro"}
              </Badge>
              {getStatusBadge(viewing?.status || "pending")}
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
                <button
                  type="button"
                  onClick={() => viewing?.created_by && navigate(`/user/${viewing.created_by}`)}
                  className="hover:text-primary hover:underline cursor-pointer transition-colors"
                >
                  {viewing?.creator?.full_name}
                </button>
                {" "}•{" "}
                {viewing && format(new Date(viewing.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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

            {viewing?.description && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Descrição</Label>
                <div className="p-3 rounded-md bg-muted text-sm overflow-hidden">
                  <RichTextDisplay content={viewing.description} />
                </div>
              </div>
            )}

            {viewing?.status === "returned" && viewing?.rejection_reason && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">Motivo da devolução:</p>
                <div className="text-sm">
                  <RichTextDisplay content={viewing.rejection_reason} />
                </div>
              </div>
            )}

            {(viewing?.status === "approved" || viewing?.status === "returned") && viewing?.responder && (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                <span className="font-medium">{viewing.status === "approved" ? "Aprovada" : "Devolvida"}</span> por{" "}
                <button
                  type="button"
                  onClick={() => viewing?.responded_by && navigate(`/user/${viewing.responded_by}`)}
                  className="font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                >
                  {viewing.responder.full_name}
                </button>
                {viewing.responded_at && (
                  <span> em {format(new Date(viewing.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                )}
              </div>
            )}

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

            <div className="space-y-3 pt-4 border-t">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Comentários ({comments?.length || 0})
              </Label>
              
              <div className="space-y-2">
                <MentionInput 
                  value={commentText} 
                  onChange={setCommentText} 
                  boardId={viewing?.board_id || selectedBoardId || ""} 
                  placeholder="Adicione um comentário... Use @ para mencionar" 
                  className="min-h-[60px]" 
                  allowedRoles={["admin", "moderator", "executor"]} 
                />
                
                <div className="flex items-center gap-2">
                  <Button onClick={handleAddComment} disabled={!commentText.trim() || createComment.isPending || uploadAttachment.isPending} size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    {createComment.isPending || uploadAttachment.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                  <CommentAttachmentUploader pendingFiles={pendingFiles} onFilesChange={setPendingFiles} disabled={createComment.isPending || uploadAttachment.isPending} buttonOnly />
                  {pendingFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">{pendingFiles.length}/5 arquivos</span>
                  )}
                </div>
                
                <CommentAttachmentUploader pendingFiles={pendingFiles} onFilesChange={setPendingFiles} disabled={createComment.isPending || uploadAttachment.isPending} filesListOnly />
              </div>

              <ScrollArea className="max-h-48">
                <div className="space-y-3 pr-2">
                  {commentsLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Carregando comentários...</p>
                  ) : comments && comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-2 p-3 bg-muted/50 rounded-lg group">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(comment.profiles?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/user/${comment.user_id}`);
                              }}
                              className="text-sm font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                            >
                              {comment.profiles?.full_name}
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                              {user?.id === comment.user_id && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteComment(comment.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm mt-0.5">
                            <RichTextDisplay content={comment.content} />
                          </div>
                          <CommentAttachments commentId={comment.id} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">Nenhum comentário ainda</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Actions for admins/moderators */}
            {canApproveOrReturn && (viewing?.status === "pending" || viewing?.status === "returned") && (
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  onClick={e => {
                    e.stopPropagation();
                    setViewing(null);
                    openApproveDialog(viewing);
                  }} 
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {viewing?.status === "returned" ? "Reaprovar e Criar Demanda" : "Aprovar e Criar Demanda"}
                </Button>
                {viewing?.status === "pending" && (
                  <Button 
                    variant="outline" 
                    onClick={e => {
                      e.stopPropagation();
                      setViewing(null);
                      setReturning(viewing);
                    }} 
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Devolver para Revisão
                  </Button>
                )}
              </div>
            )}

            {/* Actions for requester editing */}
            {isRequester && user?.id === viewing?.created_by && (viewing?.status === "pending" || viewing?.status === "returned") && (
              <div className="flex gap-2 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => { setViewing(null); openEditDialog(viewing); }}>
                  <Edit className="h-4 w-4 mr-1" />
                  {viewing?.status === "returned" ? "Editar e Reenviar" : "Editar"}
                </Button>
                {viewing?.status === "pending" && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setViewing(null); handleDeleteRequest(viewing.id); }}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={!!approving} onOpenChange={() => setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approving?.status === "returned" ? "Reaprovar Solicitação" : "Aprovar Solicitação"}</DialogTitle>
            <DialogDescription>
              Configure os responsáveis e a data de vencimento para criar a demanda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-md bg-muted">
              <p className="font-medium">{approving?.title}</p>
              {approving?.description && <p className="text-sm text-muted-foreground mt-1">{approving.description}</p>}
            </div>

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
              <AssigneeSelector teamId={selectedTeamId} boardId={selectedBoardId} selectedUserIds={assigneeIds} onChange={setAssigneeIds} />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              {approving?.service && (
                <p className="text-xs text-muted-foreground">
                  Prazo sugerido: {approving.service.estimated_hours}h a partir da aprovação (dias úteis)
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setApproving(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleApprove} disabled={approveRequest.isPending} className="flex-1">
                {approveRequest.isPending ? "Criando..." : (approving?.status === "returned" ? "Reaprovar e Criar" : "Aprovar e Criar")}
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
              <MentionInput 
                value={returnReason} 
                onChange={setReturnReason} 
                boardId={returning?.board_id || selectedBoardId || ""}
                placeholder="Descreva os ajustes necessários... Use # para mencionar demandas"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setReturning(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleReturn} disabled={returnRequest.isPending || !returnReason.trim()} className="flex-1">
                {returnRequest.isPending ? "Enviando..." : "Devolver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Resubmit Dialog (Requester) */}
      <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingRequest?.status === "returned" ? "Editar e Reenviar Solicitação" : "Editar Solicitação"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <form onSubmit={handleResubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <RichTextEditor value={editDescription} onChange={setEditDescription} minHeight="100px" placeholder="Descreva sua solicitação..." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    value={editServiceId}
                    onChange={setEditServiceId}
                  />
                </div>
              </div>

              {editingRequest && (
                <div className="border-t pt-4">
                  <RequestAttachmentUploader requestId={editingRequest.id} />
                </div>
              )}
              
              <div className="flex gap-2 pt-2 pb-1">
                <Button type="button" variant="outline" onClick={() => setEditingRequest(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateRequest.isPending} className="flex-1">
                  {updateRequest.isPending ? "Salvando..." : editingRequest?.status === "returned" ? "Reenviar" : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
