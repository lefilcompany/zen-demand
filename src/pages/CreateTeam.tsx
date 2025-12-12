import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTeam, generateAccessCode } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff, Users, Loader2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { supabase } from "@/integrations/supabase/client";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";

export default function CreateTeam() {
  const navigate = useNavigate();
  const { setSelectedTeamId } = useSelectedTeam();
  const createTeam = useCreateTeam();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessCode, setAccessCode] = useState(() => generateAccessCode());
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const getCodeStrength = (code: string) => {
    if (code.length < 6) return { level: 0, label: "Muito fraco", color: "bg-destructive" };
    
    const hasLetters = /[A-Z]/.test(code);
    const hasNumbers = /[0-9]/.test(code);
    const isMixed = hasLetters && hasNumbers;
    
    if (code.length >= 10 && isMixed) return { level: 4, label: "Excelente", color: "bg-emerald-500" };
    if (code.length >= 8 && isMixed) return { level: 3, label: "Forte", color: "bg-emerald-400" };
    if (code.length >= 6 && isMixed) return { level: 2, label: "Bom", color: "bg-amber-500" };
    if (code.length >= 6) return { level: 1, label: "Fraco", color: "bg-amber-400" };
    
    return { level: 0, label: "Muito fraco", color: "bg-destructive" };
  };

  const codeStrength = getCodeStrength(accessCode);

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
    if (accessCode.length < 6) {
      toast.error("Código de acesso deve ter no mínimo 6 caracteres");
      return;
    }

    createTeam.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        accessCode: accessCode,
      },
      {
        onSuccess: async () => {
          toast.success("Equipe criada com sucesso!", {
            description: "Faça login novamente para acessar sua equipe.",
          });
          await supabase.auth.signOut();
          navigate("/auth");
        },
        onError: (error: any) => {
          if (error.code === "23505") {
            toast.error("Código já em uso", {
              description: "Gere um novo código ou insira outro.",
            });
          } else {
            toast.error("Erro ao criar equipe", {
              description: getErrorMessage(error),
            });
          }
        },
      }
    );
  };

  const isFormValid = name.trim().length > 0 && accessCode.length >= 6 && accessCode.length <= 10;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Mobile/Tablet Header with Image */}
      <div 
        className="lg:hidden relative h-40 sm:h-48 overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-8 sm:h-10 w-auto mb-2" />
          <h2 className="text-lg font-semibold">Criar Nova Equipe</h2>
        </div>
      </div>

      {/* Desktop Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img src={logoSomaDark} alt="SoMA" className="h-12 w-auto" />
          </div>
          <div className="max-w-md">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur mb-6">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Crie sua Equipe
            </h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Configure sua equipe, defina um código de acesso e convide seus membros para colaborar.
            </p>
          </div>
          <div className="text-white/60 text-sm">
            O código de acesso deve ter entre 6 e 10 caracteres
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-start lg:items-center justify-center p-6 sm:p-8 md:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/welcome")}
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Nova Equipe
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Preencha os dados para criar sua equipe
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="Descreva o propósito da equipe..."
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
                Membros usarão este código para entrar
              </p>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="accessCode"
                    type={showCode ? "text" : "password"}
                    value={accessCode}
                    onChange={handleAccessCodeChange}
                    placeholder="ABC1234XYZ"
                    className="h-12 text-base font-mono tracking-[0.15em] uppercase text-center bg-muted/50 border-2 focus:border-primary transition-colors pr-14"
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
                  title={showCode ? "Ocultar" : "Mostrar"}
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

              {/* Strength Indicator */}
              {accessCode.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Força do código</span>
                    <span className={`font-medium ${codeStrength.level >= 3 ? 'text-emerald-500' : codeStrength.level >= 2 ? 'text-amber-500' : 'text-destructive'}`}>
                      {codeStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          level <= codeStrength.level ? codeStrength.color : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {accessCode.length > 0 && accessCode.length < 6 && (
                <p className="text-sm text-destructive">
                  O código deve ter no mínimo 6 caracteres
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
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
      </div>
    </div>
  );
}
