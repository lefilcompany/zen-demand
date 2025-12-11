import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  moderator: "Coordenador",
  requester: "Solicitante",
  executor: "Agente",
};

const roleColors: Record<string, string> = {
  admin: "bg-primary/20 border border-primary/30 text-foreground",
  moderator: "bg-blue-500/20 border border-blue-500/30 text-foreground",
  requester: "bg-emerald-500/20 border border-emerald-500/30 text-foreground",
  executor: "bg-amber-500/20 border border-amber-500/30 text-muted-foreground hover:text-white",
};

export function TeamSelector() {
  const navigate = useNavigate();
  const { teams, selectedTeamId, setSelectedTeamId, isLoading, hasTeams } = useSelectedTeam();
  const { data: role } = useTeamRole(selectedTeamId);

  if (isLoading) {
    return <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />;
  }

  if (!hasTeams) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate("/welcome")} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Entrar em Equipe
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
        <SelectTrigger className="w-52 border-border bg-background">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <SelectValue placeholder="Selecione uma equipe" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {teams?.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {role && (
        <Badge variant="secondary" className={roleColors[role]}>
          {roleLabels[role]}
        </Badge>
      )}
    </div>
  );
}
