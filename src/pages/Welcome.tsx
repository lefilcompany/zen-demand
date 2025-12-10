import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { Users, Plus, ArrowRight } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const { data: role, isLoading } = useUserRole();

  const isAdmin = role === "admin";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Bem-vindo ao DemandFlow!</h1>
          <p className="text-muted-foreground text-lg">
            Sua conta foi criada com sucesso. O que você gostaria de fazer?
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {isAdmin && (
            <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate("/teams/create")}>
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
                  Como administrador, você pode criar equipes, definir serviços e gerenciar membros.
                </p>
                <Button variant="link" className="p-0 mt-2 group-hover:text-primary">
                  Criar equipe <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate("/teams/join")}>
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
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            Ir para o Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
