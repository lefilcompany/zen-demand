import { useState, useCallback, useEffect } from "react";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sparkles, RefreshCw, AlertCircle, TrendingUp, AlertTriangle, 
  CheckCircle2, Clock, Target, Lightbulb, Users, BarChart3,
  Timer, Copy, Download, Share2
} from "lucide-react";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { useBoardSummaryHistory, BoardSummaryHistoryItem } from "@/hooks/useBoardSummaryHistory";
import { SummaryHistoryDrawer } from "@/components/SummaryHistoryDrawer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BoardAnalytics {
  board: { name: string; description: string | null; monthlyLimit: number | null };
  period: { start: string; end: string; days: number };
  demands: {
    total: number;
    delivered: number;
    onTime: number;
    late: number;
    overdue: number;
    avgDeliveryDays: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
  };
  members: {
    name: string;
    role: string;
    demandCount: number;
    completedCount: number;
    completionRate: number;
    avgTimeHours: number;
  }[];
  requesters: {
    name: string;
    requestCount: number;
    pending: number;
    approved: number;
    rejected: number;
    avgPerWeek: number;
  }[];
  timeTracking: {
    totalHours: number;
    byExecutor: { name: string; hours: number; demandCount: number }[];
    avgHoursPerDemand: number;
  };
}

function QuickStatsCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  variant = "default" 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-muted/50 text-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg", variantStyles[variant])}>
            <Icon className={cn("h-5 w-5", iconStyles[variant])} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground/70 truncate">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberPerformanceCard({ member }: { member: BoardAnalytics["members"][0] }) {
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    moderator: "Moderador",
    executor: "Executor",
    requester: "Solicitante",
  };

  const roleBadgeColors: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    moderator: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    executor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    requester: "bg-muted text-muted-foreground",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary">
            {member.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{member.name}</p>
          <span className={cn("text-xs px-2 py-0.5 rounded-full", roleBadgeColors[member.role] || roleBadgeColors.requester)}>
            {roleLabels[member.role] || member.role}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium">{member.completedCount}/{member.demandCount}</p>
        <p className="text-xs text-muted-foreground">{member.completionRate}% concluído</p>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BoardSummary() {
  const { currentBoard } = useSelectedBoardSafe();
  const [summary, setSummary] = useState("");
  const [analytics, setAnalytics] = useState<BoardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSummaryId, setCurrentSummaryId] = useState<string | null>(null);
  
  const { saveSummary, createShareToken } = useBoardSummaryHistory(currentBoard?.id);

  const generateSummary = useCallback(async () => {
    if (!currentBoard?.id) {
      toast.error("Selecione um quadro primeiro");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary("");
    setAnalytics(null);
    setCurrentSummaryId(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error("Você precisa estar logado para gerar a análise");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/board-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ boardId: currentBoard.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar análise");
      }

      if (!response.body) {
        throw new Error("Stream não disponível");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let summaryText = "";
      let analyticsData: BoardAnalytics | null = null;

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
            
            if (parsed.type === "analytics" && parsed.data) {
              analyticsData = parsed.data;
              setAnalytics(parsed.data);
              continue;
            }
            
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

      // Save to history after generation is complete
      if (summaryText && analyticsData) {
        const saved = await saveSummary.mutateAsync({
          boardId: currentBoard.id,
          summaryText,
          analyticsData,
        });
        if (saved) {
          setCurrentSummaryId(saved.id);
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
  }, [currentBoard?.id, saveSummary]);

  const handleSelectFromHistory = (item: BoardSummaryHistoryItem) => {
    setSummary(item.summary_text);
    setAnalytics(item.analytics_data);
    setCurrentSummaryId(item.id);
    setError(null);
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Análise copiada para a área de transferência");
    } catch {
      toast.error("Erro ao copiar análise");
    }
  };

  const handleExportPDF = () => {
    if (!summary || !analytics) return;

    const doc = new jsPDF();
    const boardName = analytics.board.name || "Quadro";
    const createdAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    doc.setFontSize(18);
    doc.text(`Análise Inteligente - ${boardName}`, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${createdAt}`, 20, 30);
    
    doc.setTextColor(0);
    doc.setFontSize(12);
    
    const splitText = doc.splitTextToSize(summary, 170);
    doc.text(splitText, 20, 45);
    
    doc.save(`analise-${boardName.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const handleShare = async () => {
    if (!currentSummaryId) {
      toast.error("Gere uma análise primeiro para compartilhar");
      return;
    }
    
    const result = await createShareToken.mutateAsync(currentSummaryId);
    if (result) {
      const shareUrl = `${window.location.origin}/shared/summary/${result.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link de compartilhamento copiado!");
    }
  };

  const onTimeRate = analytics?.demands 
    ? analytics.demands.onTime + analytics.demands.late > 0
      ? Math.round((analytics.demands.onTime / (analytics.demands.onTime + analytics.demands.late)) * 100)
      : 0
    : 0;

  if (!currentBoard) {
    return (
      <div className="container mx-auto py-6 px-4">
        <PageBreadcrumb items={[{ label: "Análise IA" }]} />
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Selecione um quadro para gerar a análise por IA
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <PageBreadcrumb items={[{ label: "Análise IA" }]} />
      
      <div className="mt-6 space-y-6">
        {/* Header Card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Análise Inteligente</h1>
                  <p className="text-sm text-muted-foreground">
                    Quadro: <span className="font-medium text-foreground">{currentBoard.name}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SummaryHistoryDrawer 
                  boardId={currentBoard.id} 
                  onSelectSummary={handleSelectFromHistory} 
                />
                
                {summary && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar texto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Compartilhar link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <Button
                  onClick={generateSummary}
                  disabled={isLoading}
                  size="sm"
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
                      {analytics ? "Atualizar" : "Gerar Análise"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && !analytics && <AnalyticsSkeleton />}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickStatsCard
              icon={BarChart3}
              label="Total de Demandas"
              value={analytics.demands.total}
              subValue={`${analytics.demands.delivered} entregues`}
              variant="default"
            />
            <QuickStatsCard
              icon={CheckCircle2}
              label="Entregas no Prazo"
              value={`${onTimeRate}%`}
              subValue={`${analytics.demands.onTime} de ${analytics.demands.onTime + analytics.demands.late}`}
              variant={onTimeRate >= 80 ? "success" : onTimeRate >= 60 ? "warning" : "danger"}
            />
            <QuickStatsCard
              icon={AlertTriangle}
              label="Demandas Atrasadas"
              value={analytics.demands.overdue}
              subValue="prazo vencido"
              variant={analytics.demands.overdue === 0 ? "success" : analytics.demands.overdue <= 3 ? "warning" : "danger"}
            />
            <QuickStatsCard
              icon={Timer}
              label="Tempo Médio"
              value={`${analytics.demands.avgDeliveryDays} dias`}
              subValue="por demanda"
              variant="default"
            />
          </div>
        )}

        {/* Additional Stats */}
        {analytics && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Team Performance */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Equipe</CardTitle>
                </div>
                <CardDescription>Performance dos membros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {analytics.members.length > 0 ? (
                  analytics.members
                    .filter(m => m.demandCount > 0)
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((member, i) => (
                      <MemberPerformanceCard key={i} member={member} />
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum membro com demandas atribuídas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Time Tracking */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Tempo Investido</CardTitle>
                </div>
                <CardDescription>Horas registradas por executor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-medium">Total de Horas</span>
                  <span className="text-lg font-bold text-primary">{analytics.timeTracking.totalHours}h</span>
                </div>
                {analytics.timeTracking.byExecutor.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {analytics.timeTracking.byExecutor
                      .sort((a, b) => b.hours - a.hours)
                      .map((executor, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{executor.name}</span>
                          <span className="font-medium">{executor.hours}h ({executor.demandCount} demandas)</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum tempo registrado
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Summary */}
        {(summary || (isLoading && analytics)) && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Relatório de Análise</CardTitle>
                  <CardDescription>Gerado por IA com base nos dados do quadro</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {summary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2 text-foreground first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-medium mt-4 mb-2 text-foreground">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-muted-foreground leading-relaxed mb-3">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1.5 my-3 ml-1">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-muted-foreground flex items-start gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Gerando análise...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !analytics && !error && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border/50">
                  <Sparkles className="h-12 w-12 text-primary/60" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Pronto para analisar seu quadro
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Clique em "Gerar Análise" para criar um relatório executivo completo com insights 
                sobre demandas, performance da equipe e recomendações.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>Performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary/70" />
                  <span>Equipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary/50" />
                  <span>Recomendações</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
