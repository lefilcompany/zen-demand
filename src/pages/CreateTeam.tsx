import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTeam, generateAccessCode } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateTeam() {
  const navigate = useNavigate();
  const { setSelectedTeamId } = useSelectedTeam();
  const createTeam = useCreateTeam();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessCode, setAccessCode] = useState(() => generateAccessCode());
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleGenerateCode = () => {
    setAccessCode(generateAccessCode());
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(accessCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setAccessCode(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (accessCode.length < 6) {
      toast.error("Código de acesso deve ter 6 caracteres");
      return;
    }

    createTeam.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        accessCode: accessCode,
      },
      {
        onSuccess: (team) => {
          if (team?.id) {
            setSelectedTeamId(team.id);
          }
          toast.success("Equipe criada com sucesso!", {
            description: "Compartilhe o código de acesso com os membros.",
          });
          navigate("/");
        },
        onError: (error: any) => {
          if (error.code === "23505") {
            toast.error("Código já em uso", {
              description: "Gere um novo código ou insira outro.",
            });
          } else {
            toast.error("Erro ao criar equipe", {
              description: error.message || "Tente novamente.",
            });
          }
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/welcome")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Criar Nova Equipe</h1>
          <p className="text-muted-foreground">
            Crie uma equipe e convide membros usando o código de acesso
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

              <div className="space-y-2">
                <Label htmlFor="accessCode">Código de Acesso</Label>
                <p className="text-sm text-muted-foreground">
                  Membros usarão este código para entrar na equipe
                </p>
                <div className="flex gap-2">
                  <Input
                    id="accessCode"
                    type={showCode ? "text" : "password"}
                    value={accessCode}
                    onChange={handleAccessCodeChange}
                    placeholder="EX: ABC123"
                    className="font-mono text-lg tracking-widest uppercase"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCode(!showCode)}
                    title={showCode ? "Ocultar código" : "Mostrar código"}
                  >
                    {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateCode}
                    title="Gerar novo código"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    title="Copiar código"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {accessCode.length > 0 && accessCode.length < 6 && (
                  <p className="text-sm text-destructive">
                    O código deve ter 6 caracteres ({accessCode.length}/6)
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/welcome")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTeam.isPending || !name.trim() || accessCode.length < 6}
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
