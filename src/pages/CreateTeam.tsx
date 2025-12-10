import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTeam } from "@/hooks/useTeams";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateTeam() {
  const navigate = useNavigate();
  const { data: userRole } = useUserRole();
  const createTeam = useCreateTeam();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isAdmin = userRole === "admin";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createTeam.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Equipe criada com sucesso!", {
            description: "Compartilhe o código de acesso com os membros.",
          });
          navigate("/teams");
        },
        onError: (error: any) => {
          toast.error("Erro ao criar equipe", {
            description: error.message || "Tente novamente.",
          });
        },
      }
    );
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Negado</CardTitle>
              <CardDescription>
                Apenas administradores podem criar equipes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/teams")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Equipes
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/teams")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Criar Nova Equipe</h1>
          <p className="text-muted-foreground">
            Crie uma equipe e convide membros usando o código de acesso gerado
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Equipe</CardTitle>
            <CardDescription>
              Preencha os dados para criar uma nova equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Equipe *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Equipe de Desenvolvimento"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito e objetivos da equipe..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/teams")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTeam.isPending || !name.trim()}
                  className="flex-1"
                >
                  {createTeam.isPending ? "Criando..." : "Criar Equipe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
