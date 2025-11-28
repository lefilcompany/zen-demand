import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    description?: string;
    access_code: string;
    created_at: string;
    profiles?: {
      full_name: string;
    };
  };
  onClick?: () => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{team.name}</CardTitle>
            {team.description && (
              <CardDescription>{team.description}</CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="ml-2">
            {team.access_code}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Criado por {team.profiles?.full_name || "Usuário"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(team.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
