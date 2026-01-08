import { useState } from "react";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, AlertTriangle, CheckCircle2, Clock, Target, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { cn } from "@/lib/utils";

// Component to render formatted AI response with visual enhancements
function FormattedSummary({ content }: { content: string }) {
  const lines = content.split('\n');
  
  const getLineType = (line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('##') || trimmed.startsWith('**') && trimmed.endsWith('**')) return 'heading';
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) return 'bullet';
    if (trimmed.match(/^\d+\./)) return 'numbered';
    if (trimmed.startsWith('⚠') || trimmed.toLowerCase().includes('atenção') || trimmed.toLowerCase().includes('atrasad')) return 'warning';
    if (trimmed.startsWith('✅') || trimmed.toLowerCase().includes('concluíd') || trimmed.toLowerCase().includes('entregue')) return 'success';
    if (trimmed.toLowerCase().includes('recomend') || trimmed.toLowerCase().includes('sugest')) return 'recommendation';
    if (trimmed === '') return 'empty';
    return 'text';
  };

  const getIcon = (line: string) => {
    const lower = line.toLowerCase();
    if (lower.includes('visão geral') || lower.includes('resumo')) return <TrendingUp className="h-5 w-5" />;
    if (lower.includes('atenção') || lower.includes('pendente') || lower.includes('atrasad')) return <AlertTriangle className="h-5 w-5" />;
    if (lower.includes('progresso') || lower.includes('concluíd') || lower.includes('entregue')) return <CheckCircle2 className="h-5 w-5" />;
    if (lower.includes('solicitaç')) return <Clock className="h-5 w-5" />;
    if (lower.includes('recomend') || lower.includes('próximo') || lower.includes('sugest')) return <Lightbulb className="h-5 w-5" />;
    if (lower.includes('priorid') || lower.includes('crític') || lower.includes('urgent')) return <Target className="h-5 w-5" />;
    return null;
  };

  const formatText = (text: string) => {
    // Bold text **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    // Highlight numbers
    formatted = formatted.replace(/(\d+)/g, '<span class="font-medium text-primary">$1</span>');
    // Highlight status words
    formatted = formatted.replace(/(pendente|em andamento|concluído|atrasado|alta|média|baixa)/gi, (match) => {
      const lower = match.toLowerCase();
      if (lower === 'pendente' || lower === 'atrasado') return `<span class="text-amber-600 dark:text-amber-400 font-medium">${match}</span>`;
      if (lower === 'em andamento') return `<span class="text-blue-600 dark:text-blue-400 font-medium">${match}</span>`;
      if (lower === 'concluído') return `<span class="text-emerald-600 dark:text-emerald-400 font-medium">${match}</span>`;
      if (lower === 'alta') return `<span class="text-red-600 dark:text-red-400 font-medium">${match}</span>`;
      if (lower === 'média') return `<span class="text-amber-600 dark:text-amber-400 font-medium">${match}</span>`;
      if (lower === 'baixa') return `<span class="text-emerald-600 dark:text-emerald-400 font-medium">${match}</span>`;
      return match;
    });
    return formatted;
  };

  let currentSection: string | null = null;

  return (
    <div className="space-y-4">
      {lines.map((line, index) => {
        const type = getLineType(line);
        const trimmed = line.trim();
        
        if (type === 'empty') return <div key={index} className="h-2" />;
        
        // Check if it's a section heading
        const isHeading = type === 'heading' || (trimmed.match(/^\d+\./) && !trimmed.match(/^\d+\.\d/));
        const headingText = trimmed.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/^\d+\.\s*/, '');
        
        if (isHeading) {
          currentSection = headingText.toLowerCase();
          const icon = getIcon(headingText);
          
          return (
            <div key={index} className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
              {icon && (
                <div className={cn(
                  "p-2 rounded-lg",
                  headingText.toLowerCase().includes('atenção') || headingText.toLowerCase().includes('atrasad')
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : headingText.toLowerCase().includes('concluíd') || headingText.toLowerCase().includes('progresso')
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : headingText.toLowerCase().includes('recomend') || headingText.toLowerCase().includes('sugest')
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    : "bg-primary/10 text-primary"
                )}>
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground">{headingText}</h3>
            </div>
          );
        }

        // Bullet points
        if (type === 'bullet' || type === 'numbered') {
          const bulletText = trimmed.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
          const isWarning = currentSection?.includes('atenção') || bulletText.toLowerCase().includes('atrasad') || bulletText.toLowerCase().includes('urgent');
          const isSuccess = currentSection?.includes('progresso') || bulletText.toLowerCase().includes('concluíd') || bulletText.toLowerCase().includes('entregue');
          
          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg ml-2 border-l-2 transition-colors",
                isWarning 
                  ? "bg-amber-500/5 border-amber-500 dark:bg-amber-500/10" 
                  : isSuccess 
                  ? "bg-emerald-500/5 border-emerald-500 dark:bg-emerald-500/10"
                  : "bg-muted/50 border-muted-foreground/20"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full mt-2 shrink-0",
                isWarning ? "bg-amber-500" : isSuccess ? "bg-emerald-500" : "bg-primary"
              )} />
              <span 
                className="text-sm text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatText(bulletText) }}
              />
            </div>
          );
        }

        // Regular text
        return (
          <p 
            key={index} 
            className="text-sm text-muted-foreground leading-relaxed pl-2"
            dangerouslySetInnerHTML={{ __html: formatText(trimmed) }}
          />
        );
      })}
    </div>
  );
}

export default function BoardSummary() {
  const { currentBoard } = useSelectedBoardSafe();
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (!currentBoard?.id) {
      toast.error("Selecione um quadro primeiro");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/board-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ boardId: currentBoard.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar resumo");
      }

      if (!response.body) {
        throw new Error("Stream não disponível");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let summaryText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              summaryText += content;
              setSummary(summaryText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentBoard) {
    return (
      <div className="container mx-auto py-6 px-4">
        <PageBreadcrumb items={[{ label: "Resumo IA" }]} />
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Selecione um quadro para gerar o resumo por IA
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <PageBreadcrumb items={[{ label: "Resumo IA" }]} />
      
      <div className="mt-6 space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-b">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Resumo Inteligente</CardTitle>
                  <CardDescription className="mt-1">
                    Análise do quadro <span className="font-medium text-foreground">"{currentBoard.name}"</span>
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={generateSummary}
                disabled={isLoading}
                size="lg"
                className="gap-2 shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Análise
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive mb-6">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </p>
              </div>
            )}
            
            {summary ? (
              <div className="animate-in fade-in-0 duration-500">
                <FormattedSummary content={summary} />
              </div>
            ) : !isLoading && !error ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                  <div className="relative p-6 rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border/50">
                    <Sparkles className="h-12 w-12 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Pronto para analisar seu quadro
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Clique em "Gerar Análise" para criar um resumo executivo completo com insights sobre demandas, progresso e recomendações
                </p>
                <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>Visão geral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Alertas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-purple-500" />
                    <span>Sugestões</span>
                  </div>
                </div>
              </div>
            ) : null}
            
            {isLoading && !summary && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <div className="relative p-4 rounded-xl bg-primary/10">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Analisando demandas...</p>
                  <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
