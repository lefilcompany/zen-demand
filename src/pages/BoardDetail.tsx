import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Users, Trash2, UserPlus, UserMinus, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useBoard, useDeleteBoard } from "@/hooks/useBoards";
import { useBoardMembers, useBoardRole, useRemoveBoardMember } from "@/hooks/useBoardMembers";
import { BoardScopeConfig } from "@/components/BoardScopeConfig";
import { AddBoardMemberDialog } from "@/components/AddBoardMemberDialog";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  moderator: "Coordenador",
  executor: "Agente",
  requester: "Solicitante",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  executor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  requester: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const roleBannerColors: Record<string, string> = {
  admin: "from-red-500/80 via-red-600 to-red-500/60",
  moderator: "from-blue-500/80 via-blue-600 to-blue-500/60",
  executor: "from-green-500/80 via-green-600 to-green-500/60",
  requester: "from-gray-400/80 via-gray-500 to-gray-400/60",
};

export default function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const { data: board, isLoading: boardLoading } = useBoard(boardId || null);
  const { data: members, isLoading: membersLoading } = useBoardMembers(boardId || null);
  const { data: myRole } = useBoardRole(boardId || null);
  const deleteBoard = useDeleteBoard();
  const removeMember = useRemoveBoardMember();

  const canManage = myRole === "admin" || myRole === "moderator";
  const isAdmin = myRole === "admin";
  const isRequester = myRole === "requester";

  const handleDeleteBoard = async () => {
    if (!board) return;
    
    try {
      await deleteBoard.mutateAsync({ boardId: board.id, teamId: board.team_id });
      toast.success("Quadro excluído com sucesso!");
      navigate("/boards");
    } catch (error) {
      toast.error("Erro ao excluir quadro");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!boardId) return;
    
    try {
      await removeMember.mutateAsync({ memberId, boardId });
    } catch (error) {
      toast.error("Erro ao remover membro");
    }
  };

  if (boardLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Quadro não encontrado</h2>
        <Button onClick={() => navigate("/boards")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Quadros
        </Button>
      </div>
    );
  }

  // Requester view - simplified with description and horizontal member list
  if (isRequester) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Breadcrumbs */}
        <PageBreadcrumb
          items={[
            { label: "Quadros", href: "/boards", icon: LayoutGrid },
            { label: board.name, isCurrent: true },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{board.name}</h1>
            {board.is_default && (
              <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
            )}
          </div>
        </div>

        {/* Description Card */}
        {board.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Descrição do Quadro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{board.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Members - Grid Layout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 shrink-0" />
              Membros do Quadro
            </CardTitle>
            <CardDescription className="text-sm">
              {members?.length || 0} membros neste quadro
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Colored Banner */}
                    <div className={`h-16 bg-gradient-to-r ${roleBannerColors[member.teamRole] || "from-primary/80 via-primary to-primary/60"}`} />
                    
                    {/* Avatar positioned over banner */}
                    <div className="relative px-4 pb-4">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                        <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                          <AvatarImage src={member.profile?.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-muted font-semibold">
                            {member.profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      {/* Member Info */}
                      <div className="pt-12 text-center">
                        <p className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem]">
                          {member.profile?.full_name || "Usuário"}
                        </p>
                        <Badge className={`text-xs mt-2 ${roleColors[member.teamRole] || ""}`}>
                          {roleLabels[member.teamRole] || member.teamRole}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro neste quadro</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin/Moderator/Executor view - full view
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <PageBreadcrumb
        items={[
          { label: "Quadros", href: "/boards", icon: LayoutGrid },
          { label: board.name, isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{board.name}</h1>
            {board.is_default && (
              <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
            )}
          </div>
          {board.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{board.description}</p>
          )}
        </div>
        
        {isAdmin && !board.is_default && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="hidden sm:inline-flex shrink-0">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Quadro
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Quadro</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o quadro "{board.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBoard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Scope Configuration */}
        <BoardScopeConfig boardId={board.id} canEdit={canManage} />

        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5 shrink-0" />
                  <span className="truncate">Membros do Quadro</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  {members?.length || 0} membros neste quadro
                  <span className="block text-xs mt-1">
                    Os cargos são gerenciados nas configurações da equipe
                  </span>
                </CardDescription>
              </div>
              {canManage && (
                <AddBoardMemberDialog 
                  boardId={board.id}
                  trigger={
                    <Button size="sm" className="hidden sm:inline-flex shrink-0">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  }
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profile?.full_name || "Usuário"}</p>
                        <Badge className={`text-xs ${roleColors[member.teamRole] || ""}`}>
                          {roleLabels[member.teamRole] || member.teamRole}
                        </Badge>
                      </div>
                    </div>
                    
                    {canManage && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover {member.profile?.full_name} deste quadro?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRemoveMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro neste quadro</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
