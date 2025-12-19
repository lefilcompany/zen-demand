import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Copy, Check, Calendar, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeams } from "@/hooks/useTeams";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useTeamScope } from "@/hooks/useTeamScope";
import { TeamScopeConfig } from "@/components/TeamScopeConfig";
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
  const { selectedTeamId } = useSelectedTeam();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: members, isLoading: membersLoading } = useTeamMembers(selectedTeamId);
  const { data: myRole } = useTeamRole(selectedTeamId);
  const { data: teamScope } = useTeamScope(selectedTeamId);
  const [copied, setCopied] = useState(false);

  const team = teams?.find(t => t.id === selectedTeamId);
  const isAdmin = myRole === "admin";

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

  if (teamsLoading) {
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
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.profile?.full_name || "Usuário"}</p>
                      <Badge className={`text-xs ${roleColors[member.role] || ""}`}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </div>
                  </div>
                ))}
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
