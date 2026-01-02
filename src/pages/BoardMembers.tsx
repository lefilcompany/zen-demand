import { useParams, useNavigate } from "react-router-dom";
import { useBoard } from "@/hooks/useBoards";
import {
  useBoardMembers,
  useBoardRole,
  useRemoveBoardMember,
} from "@/hooks/useBoardMembers";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Trash2, Shield, UserCog, User, Briefcase } from "lucide-react";
import { AddBoardMemberDialog } from "@/components/AddBoardMemberDialog";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  moderator: "Coordenador",
  executor: "Agente",
  requester: "Solicitante",
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  moderator: <UserCog className="h-4 w-4" />,
  executor: <Briefcase className="h-4 w-4" />,
  requester: <User className="h-4 w-4" />,
};

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  moderator: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  executor: "bg-green-500/10 text-green-500 border-green-500/20",
  requester: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function BoardMembers() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: board, isLoading: boardLoading } = useBoard(boardId || null);
  const { data: members, isLoading: membersLoading } = useBoardMembers(boardId || null);
  const { data: userRole } = useBoardRole(boardId || null);
  const removeMember = useRemoveBoardMember();

  const isAdmin = userRole === "admin";
  const isModerator = userRole === "moderator";
  const canManage = isAdmin || isModerator;

  const handleRemoveMember = async (memberId: string) => {
    if (!boardId) return;
    await removeMember.mutateAsync({ memberId, boardId });
  };

  if (boardLoading || membersLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Quadro não encontrado</h2>
        <Button variant="link" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7" />
              Membros do Quadro
            </h1>
            <p className="text-muted-foreground">
              {board.name}
              {board.is_default && (
                <Badge variant="outline" className="ml-2">
                  Padrão
                </Badge>
              )}
            </p>
          </div>
        </div>
        {canManage && <AddBoardMemberDialog boardId={boardId} />}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {members?.length || 0} {members?.length === 1 ? "membro" : "membros"}
          </CardTitle>
          <CardDescription>
            Os cargos são gerenciados nas configurações da equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members?.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const memberIsAdmin = member.teamRole === "admin";
              // Can't remove yourself or admins (unless you're admin)
              const canRemove = canManage && !isCurrentUser && (!memberIsAdmin || isAdmin);

              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile?.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium flex flex-wrap items-center gap-2">
                        <span className="truncate">{member.profile?.full_name || "Usuário"}</span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Você
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Desde{" "}
                        {new Date(member.joined_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end">
                    <Badge
                      variant="outline"
                      className={`${roleColors[member.teamRole]} flex items-center gap-1`}
                    >
                      {roleIcons[member.teamRole]}
                      <span className="hidden sm:inline">{roleLabels[member.teamRole]}</span>
                      <span className="sm:hidden">{roleLabels[member.teamRole].slice(0, 5)}...</span>
                    </Badge>

                    {canRemove && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.profile?.full_name} será removido deste quadro e
                              perderá acesso às demandas.
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
                </div>
              );
            })}

            {(!members || members.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro neste quadro.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
