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
  admin: "bg-primary/20 border border-primary/30 text-foreground hover:bg-primary/20",
  moderator: "bg-blue-500/20 border border-blue-500/30 text-foreground hover:bg-blue-500/20",
  requester: "bg-emerald-500/20 border border-emerald-500/30 text-foreground hover:bg-emerald-500/20",
  executor: "bg-amber-500/20 border border-amber-500/30 text-foreground hover:bg-amber-500/20",
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
    <div className="flex items-center gap-2 min-w-0">
      <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
        <SelectTrigger className="w-auto min-w-[100px] max-w-[140px] sm:max-w-[160px] md:max-w-[200px] border-border bg-background text-xs sm:text-sm">
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            <Users className="h-3 w-3 md:h-4 md:w-4 text-primary shrink-0" />
            <span className="truncate">
              <SelectValue placeholder="Equipe" />
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg">
          {teams?.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {role && (
        <Badge variant="secondary" className={`${roleColors[role]} hidden md:flex text-xs whitespace-nowrap shrink-0`}>
          {roleLabels[role]}
        </Badge>
      )}
    </div>
  );
}
