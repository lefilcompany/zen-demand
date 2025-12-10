import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinTeam } from "@/hooks/useTeams";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function JoinTeam() {
  const navigate = useNavigate();
  const joinTeam = useJoinTeam();
  const [accessCode, setAccessCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    joinTeam.mutate(accessCode.trim().toUpperCase(), {
      onSuccess: () => {
        toast.success("Você entrou na equipe!");
        navigate("/teams");
      },
      onError: (error: any) => {
        const message = error.message?.toLowerCase() || "";
        if (message.includes("not found") || message.includes("no rows")) {
          toast.error("Código inválido", {
            description: "Nenhuma equipe encontrada com este código.",
          });
        } else if (message.includes("already a member") || message.includes("duplicate")) {
          toast.warning("Você já faz parte desta equipe.");
        } else {
          toast.error("Erro ao entrar na equipe", {
            description: error.message || "Verifique o código e tente novamente.",
          });
        }
      },
    });
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Entrar em Equipe</h1>
          <p className="text-muted-foreground">
            Use o código de acesso fornecido para entrar em uma equipe
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Código de Acesso</CardTitle>
            <CardDescription>
              Digite o código de 6 caracteres fornecido pelo administrador da equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">Código de Acesso *</Label>
                <Input
                  id="accessCode"
                  placeholder="Ex: ABC123"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  className="uppercase font-mono text-lg tracking-wider"
                />
                <p className="text-xs text-muted-foreground">
                  O código deve ter 6 caracteres
                </p>
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
                  disabled={joinTeam.isPending || accessCode.length !== 6}
                  className="flex-1"
                >
                  {joinTeam.isPending ? "Entrando..." : "Entrar na Equipe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
