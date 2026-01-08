import { useState } from "react";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

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
    <div className="container mx-auto py-6 px-4">
      <PageBreadcrumb items={[{ label: "Resumo IA" }]} />
      
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Resumo por IA</CardTitle>
                  <CardDescription>
                    Gere um resumo executivo do quadro "{currentBoard.name}" usando inteligência artificial
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={generateSummary}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Resumo
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-4">
                <p className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}
            
            {summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                  {summary}
                </div>
              </div>
            ) : !isLoading && !error ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Clique em "Gerar Resumo" para criar um resumo executivo do seu quadro</p>
                <p className="text-sm mt-2">
                  O resumo incluirá visão geral das demandas, pontos de atenção e recomendações
                </p>
              </div>
            ) : null}
            
            {isLoading && !summary && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
