import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, ArrowRight } from "lucide-react";

interface TeamPromptCardProps {
  variant: "create" | "join";
}

export function TeamPromptCard({ variant }: TeamPromptCardProps) {
  const navigate = useNavigate();

  if (variant === "create") {
    return (
      <Card 
        className="hover:shadow-lg transition-all cursor-pointer group border-border" 
        onClick={() => navigate("/teams/create")}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Criar Nova Equipe</CardTitle>
              <CardDescription>
                Crie sua equipe e convide membros
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Crie uma equipe, defina serviços e gerencie membros. Você será o administrador da equipe.
          </p>
          <Button variant="link" className="p-0 mt-2 group-hover:text-primary">
            Criar equipe <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer group border-border" 
      onClick={() => navigate("/teams/join")}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>Entrar em uma Equipe</CardTitle>
            <CardDescription>
              Use um código de acesso
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Entre em uma equipe existente usando o código de acesso fornecido pelo administrador.
        </p>
        <Button variant="link" className="p-0 mt-2 group-hover:text-primary">
          Entrar em equipe <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
