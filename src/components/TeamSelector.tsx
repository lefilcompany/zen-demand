import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TeamSelector() {
  const navigate = useNavigate();
  const { teams, selectedTeamId, setSelectedTeamId, isLoading, hasTeams, currentTeam } = useSelectedTeam();
  const { data: role } = useTeamRole(selectedTeamId);

  const isRequester = role === "requester";

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

  // For requesters: show only team tag, no selector, no role badge
  if (isRequester) {
    return (
      <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-foreground text-xs whitespace-nowrap">
        <Users className="h-3 w-3 mr-1" />
        {currentTeam?.name || "Equipe"}
      </Badge>
    );
  }

  return (
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
  );
}
