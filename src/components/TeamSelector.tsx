import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderador",
  requester: "Solicitante",
};

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  moderator: "bg-secondary text-secondary-foreground",
  requester: "bg-muted text-muted-foreground",
};

export function TeamSelector() {
  const { data: teams, isLoading } = useTeams();
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();
  const { data: role } = useTeamRole(selectedTeamId);

  if (isLoading) {
    return (
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Nenhuma equipe</span>
      </div>
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
          {teams.map((team) => (
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