import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Users, Calendar, Key, Copy, Check, Settings, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTeams, useDeleteTeam } from "@/hooks/useTeams";
import { useTeamMembers, useUpdateMemberRole, useRemoveMember } from "@/hooks/useTeamMembers";
import { useIsTeamAdmin, useTeamRole } from "@/hooks/useTeamRole";
import { useTeamScope } from "@/hooks/useTeamScope";
import { MemberCard } from "@/components/MemberCard";
import { TeamScopeConfig } from "@/components/TeamScopeConfig";
import { TeamRole } from "@/hooks/useTeamRole";
export default function TeamDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const {
    data: teams,
    isLoading: teamsLoading
  } = useTeams();
  const {
    data: members,
    isLoading: membersLoading
  } = useTeamMembers(id || null);
  const {
    isAdmin
  } = useIsTeamAdmin(id || null);
  const {
    data: role
  } = useTeamRole(id || null);
  const {
    data: scope
  } = useTeamScope(id || undefined);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const deleteTeam = useDeleteTeam();
  const team = teams?.find(t => t.id === id);
  const canManage = role === "admin" || role === "moderator";
  const handleCopyCode = () => {
    if (team?.access_code) {
      navigator.clipboard.writeText(team.access_code);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const handleRoleChange = (memberId: string, newRole: TeamRole) => {
    updateRole.mutate({
      memberId,
      newRole
    }, {
      onSuccess: () => {
        toast.success("Papel atualizado com sucesso!");
      },
      onError: (error: any) => {
        toast.error("Erro ao atualizar papel", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate(memberId, {
      onSuccess: () => {
        toast.success("Membro removido da equipe!");
      },
      onError: (error: any) => {
        toast.error("Erro ao remover membro", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  const handleDeleteTeam = () => {
    if (!id) return;
    deleteTeam.mutate(id, {
      onSuccess: () => {
        toast.success("Equipe excluída com sucesso!");
        navigate("/teams");
      },
      onError: (error: any) => {
        toast.error("Erro ao excluir equipe", {
          description: getErrorMessage(error)
        });
      }
    });
  };
  if (teamsLoading) {
    return <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>;
  }
  if (!team) {
    return <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Equipe não encontrada</h2>
        <Button onClick={() => navigate("/teams")} className="mt-4">
          Voltar para Equipes
        </Button>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in">
      {/* Header */}
      

      {/* Team Info Card */}
      

      {/* Scope Configuration - Only for Admins */}
      {isAdmin && id && <TeamScopeConfig teamId={id} currentScope={scope || null} />}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Equipe
          </CardTitle>
          <CardDescription>
            {isAdmin ? "Como administrador, você pode alterar papéis e remover membros." : "Visualize os membros da equipe e seus papéis."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div> : members && members.length > 0 ? <div className="space-y-3">
              {members.map(member => <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUserId={user?.id || ""} onRoleChange={handleRoleChange} onRemove={handleRemoveMember} isUpdating={updateRole.isPending} isRemoving={removeMember.isPending} />)}
            </div> : <p className="text-center text-muted-foreground py-8">
              Nenhum membro encontrado.
            </p>}
        </CardContent>
      </Card>
    </div>;
}