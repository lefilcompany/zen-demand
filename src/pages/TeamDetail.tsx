import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, Users, Calendar, Key, Copy, Check, Settings, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTeams, useDeleteTeam } from "@/hooks/useTeams";
import { useTeamMembers, useUpdateMemberRole, useRemoveMember } from "@/hooks/useTeamMembers";
import { useIsTeamAdmin, useTeamRole } from "@/hooks/useTeamRole";
import { MemberCard } from "@/components/MemberCard";
import { TeamRole } from "@/hooks/useTeamRole";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: members, isLoading: membersLoading } = useTeamMembers(id || null);
  const { isAdmin } = useIsTeamAdmin(id || null);
  const { data: role } = useTeamRole(id || null);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const deleteTeam = useDeleteTeam();

  const team = teams?.find((t) => t.id === id);
  const canManage = role === "admin" || role === "moderator";

  const handleCopyCode = () => {
    if (team?.access_code) {
      navigator.clipboard.writeText(team.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRoleChange = (memberId: string, newRole: TeamRole) => {
    updateRole.mutate({ memberId, newRole });
  };

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate(memberId);
  };

  const handleDeleteTeam = () => {
    if (!id) return;
    deleteTeam.mutate(id, {
      onSuccess: () => {
        navigate("/teams");
      },
    });
  };

  if (teamsLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Equipe não encontrada</h2>
          <Button onClick={() => navigate("/teams")} className="mt-4">
            Voltar para Equipes
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teams")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{team.name}</h1>
            {team.description && (
              <p className="text-muted-foreground">{team.description}</p>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/teams/${id}/services`)}>
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar Serviços
              </Button>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a equipe "{team.name}"? 
                        Esta ação não pode ser desfeita e todos os membros serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteTeam}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteTeam.isPending ? "Excluindo..." : "Excluir Equipe"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>

        {/* Team Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código de Acesso</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {team.access_code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">
                    {format(new Date(team.created_at), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Membros</p>
                  <p className="font-medium">{members?.length || 0} membros</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Como administrador, você pode alterar papéis e remover membros."
                : "Visualize os membros da equipe e seus papéis."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isAdmin={isAdmin}
                    currentUserId={user?.id || ""}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                    isUpdating={updateRole.isPending}
                    isRemoving={removeMember.isPending}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum membro encontrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
