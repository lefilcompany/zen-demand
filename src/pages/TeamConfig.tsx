import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users, Copy, Check, Calendar, Shield, Loader2, UserMinus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTeams } from "@/hooks/useTeams";
import { useTeamMembers, useUpdateMemberRole, useRemoveMember } from "@/hooks/useTeamMembers";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useTeamScope } from "@/hooks/useTeamScope";
import { TeamScopeConfig } from "@/components/TeamScopeConfig";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export default function TeamConfig() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: members, isLoading: membersLoading } = useTeamMembers(selectedTeamId);
  const { data: myRole, isLoading: roleLoading } = useTeamRole(selectedTeamId);
  const { data: teamScope } = useTeamScope(selectedTeamId);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [copied, setCopied] = useState(false);

  const team = teams?.find(t => t.id === selectedTeamId);
  const isAdmin = myRole === "admin";
  const isAdminOrModerator = myRole === "admin" || myRole === "moderator";

  // Redirect non-admins/moderators
  if (!roleLoading && !isAdminOrModerator && selectedTeamId) {
    navigate("/");
    return null;
  }

  const handleCopyCode = async () => {
    if (!team?.access_code) return;
    
    try {
      await navigator.clipboard.writeText(team.access_code);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ 
        memberId, 
        newRole: newRole as "admin" | "moderator" | "executor" | "requester" 
      });
      toast.success("Cargo atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar cargo");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast.success("Membro removido da equipe!");
    } catch (error) {
      toast.error("Erro ao remover membro");
    }
  };

  if (teamsLoading || roleLoading) {
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

  if (!team) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Equipe não encontrada</h2>
        <p className="text-muted-foreground">Selecione uma equipe para ver suas configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações da Equipe</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações e membros da sua equipe
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informações da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-lg font-semibold">{team.name}</p>
            </div>

            {team.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm">{team.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Código de Acesso</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 rounded-md bg-muted font-mono text-sm">
                  {team.access_code}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Compartilhe este código para outros usuários entrarem na equipe
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Criado em</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {format(new Date(team.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Scope Config */}
        {isAdmin && selectedTeamId && (
          <TeamScopeConfig teamId={selectedTeamId} currentScope={teamScope || null} />
        )}

        {/* Team Members */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              {members?.length || 0} membros na equipe
              {isAdmin && " • Apenas administradores podem alterar cargos"}
            </CardDescription>
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
                {members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const canEditMember = isAdmin && !isCurrentUser;
                  
                  return (
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
                          <p className="font-medium">
                            {member.profile?.full_name || "Usuário"}
                            {isCurrentUser && <span className="text-muted-foreground ml-2">(você)</span>}
                          </p>
                          {!canEditMember && (
                            <Badge className={`text-xs ${roleColors[member.role] || ""}`}>
                              {roleLabels[member.role] || member.role}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {canEditMember && (
                        <div className="flex items-center gap-2">
                          <Select 
                            value={member.role} 
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="moderator">Coordenador</SelectItem>
                              <SelectItem value="executor">Agente</SelectItem>
                              <SelectItem value="requester">Solicitante</SelectItem>
                            </SelectContent>
                          </Select>
                          
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
                                  Tem certeza que deseja remover {member.profile?.full_name} da equipe? 
                                  O membro também será removido de todos os quadros.
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro na equipe</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
