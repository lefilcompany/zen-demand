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
  useReturnDemandRequest 
} from "@/hooks/useDemandRequests";
import { ArrowLeft, Clock, CheckCircle, RotateCcw, Users, Layout, Paperclip, MessageSquare, Send, Trash2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import { Input } from "@/components/ui/input";
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

const priorityColors: Record<string, string> = {
  baixa: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  média: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  alta: "bg-destructive/20 text-destructive border-destructive/30"
};

export default function DemandRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId, currentBoard } = useSelectedBoard();
  const { data: boardRole } = useBoardRole(selectedBoardId);
  
  // Fetch all three types of requests
  const { data: pendingRequests, isLoading: pendingLoading } = usePendingDemandRequests();
  const { data: approvedRequests, isLoading: approvedLoading } = useApprovedDemandRequests();
  const { data: returnedRequests, isLoading: returnedLoading } = useReturnedDemandRequests();
  
  const approveRequest = useApproveDemandRequest();
  const returnRequest = useReturnDemandRequest();
  
  const canApproveOrReturn = boardRole === "admin" || boardRole === "moderator";
  
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "returned">("pending");
  const [viewing, setViewing] = useState<any | null>(null);
  const [approving, setApproving] = useState<any | null>(null);
  const [returning, setReturning] = useState<any | null>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [commentText, setCommentText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Pagination states
  const [approvedPage, setApprovedPage] = useState(1);
  const [returnedPage, setReturnedPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
      const comment = await createComment.mutateAsync({
        requestId: viewing.id,
        content: commentText.trim()
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

        {/* Show return reason for returned requests */}
        {request.status === "returned" && request.rejection_reason && (
          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">Motivo da devolução:</p>
            <div className="text-sm text-muted-foreground">
              <RichTextDisplay content={request.rejection_reason} />
            </div>
          </div>
        )}

        {/* Show responder info for approved/returned */}
        {(request.status === "approved" || request.status === "returned") && request.responder && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
            <span>{request.status === "approved" ? "Aprovada" : "Devolvida"} por {request.responder.full_name}</span>
            {request.responded_at && (
              <span>em {format(new Date(request.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            )}
          </div>
        )}

        {/* Reapprove button for returned requests */}
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

  const renderEmptyState = (message: string) => (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <p>{message}</p>
      </CardContent>
    </Card>
  );

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "approved" | "returned")} className="w-full">
        <TabsList className={`w-full grid mb-4 ${canApproveOrReturn ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pendentes</span>
            {pendingRequests && pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          {canApproveOrReturn && (
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovadas</span>
              {approvedRequests && approvedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {approvedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {canApproveOrReturn && (
            <TabsTrigger value="returned" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Devolvidas</span>
              {returnedRequests && returnedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {returnedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

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
                {paginatedApproved.totalPages > 1 && (
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Página {approvedPage} de {paginatedApproved.totalPages}</span>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setApprovedPage(p => Math.max(1, p - 1))}
                          disabled={approvedPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setApprovedPage(p => Math.min(paginatedApproved.totalPages, p + 1))}
                          disabled={approvedPage === paginatedApproved.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
                {paginatedReturned.totalPages > 1 && (
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Página {returnedPage} de {paginatedReturned.totalPages}</span>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setReturnedPage(p => Math.max(1, p - 1))}
                          disabled={returnedPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setReturnedPage(p => Math.min(paginatedReturned.totalPages, p + 1))}
                          disabled={returnedPage === paginatedReturned.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
                <div className="p-3 rounded-md bg-muted text-sm overflow-hidden">
                  <RichTextDisplay content={viewing.description} />
                </div>
              </div>
            )}

            {/* Return reason if returned */}
            {viewing?.status === "returned" && viewing?.rejection_reason && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">Motivo da devolução:</p>
                <div className="text-sm">
                  <RichTextDisplay content={viewing.rejection_reason} />
                </div>
              </div>
            )}

            {/* Responder info for approved/returned */}
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

            {/* Comments Section */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Comentários ({comments?.length || 0})
              </Label>
              
              {/* Comment Input */}
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
                    <span className="text-xs text-muted-foreground">
                      {pendingFiles.length}/5 arquivos
                    </span>
                  )}
                </div>
                
                <CommentAttachmentUploader pendingFiles={pendingFiles} onFilesChange={setPendingFiles} disabled={createComment.isPending || uploadAttachment.isPending} filesListOnly />
              </div>

              {/* Comments List */}
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

            {/* Actions - Only for admins/moderators on pending or returned requests */}
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
    </div>
  );
}
