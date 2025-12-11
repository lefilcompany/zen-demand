import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTeam, generateAccessCode } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff, Users, Loader2, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import logoSoma from "@/assets/logo-soma.png";

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
    toast.info("Novo código gerado");
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(accessCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setAccessCode(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (accessCode.length < 10) {
      toast.error("Código de acesso deve ter 10 caracteres");
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

  const isFormValid = name.trim().length > 0 && accessCode.length === 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar to-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-xl">
        {/* Main Card */}
        <div className="bg-background/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,hsl(var(--primary)/0.15),transparent_50%)]" />
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/welcome")}
                className="absolute -top-2 -left-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              
              <div className="text-center pt-6">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Criar Nova Equipe
                </h1>
                <p className="text-muted-foreground">
                  Configure sua equipe e convide membros
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-medium">
                Nome da Equipe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Equipe de Desenvolvimento"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-muted/50 border-2 focus:border-primary transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Descrição
                <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva o propósito e objetivos da equipe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none bg-muted/50 border-2 focus:border-primary transition-colors"
              />
            </div>

            {/* Access Code Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label htmlFor="accessCode" className="text-base font-medium">
                  Código de Acesso
                </Label>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">
                Membros usarão este código para solicitar entrada na equipe
              </p>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="accessCode"
                    type={showCode ? "text" : "password"}
                    value={accessCode}
                    onChange={handleAccessCodeChange}
                    placeholder="ABC1234XYZ"
                    className="h-12 text-lg font-mono tracking-[0.2em] uppercase text-center bg-muted/50 border-2 focus:border-primary transition-colors pr-12"
                    maxLength={10}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    {accessCode.length}/10
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCode(!showCode)}
                  className="h-12 w-12 flex-shrink-0"
                  title={showCode ? "Ocultar código" : "Mostrar código"}
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCode}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Gerar Novo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>

              {accessCode.length > 0 && accessCode.length < 10 && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  O código deve ter 10 caracteres
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Você será o Administrador</p>
                <p>Como criador da equipe, você terá controle total para gerenciar membros, serviços e configurações.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/welcome")}
                className="flex-1 h-12"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTeam.isPending || !isFormValid}
                className="flex-1 h-12 gap-2"
              >
                {createTeam.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Criar Equipe
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-muted-foreground/60 text-sm mt-6">
          Após criar a equipe, compartilhe o código de acesso com os membros
        </p>
      </div>
    </div>
  );
}
