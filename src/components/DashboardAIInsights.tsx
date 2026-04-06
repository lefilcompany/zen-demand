import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertTriangle, CheckCircle, Info, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AIInsight {
  title: string;
  description: string;
  type: "warning" | "success" | "info";
}

interface DashboardAIInsightsProps {
  boardId: string | null;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/20",
    iconColor: "text-amber-500",
    titleColor: "text-amber-700 dark:text-amber-400",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-700 dark:text-emerald-400",
  },
  info: {
    icon: Info,
    bg: "bg-primary/10",
    border: "border-primary/20",
    iconColor: "text-primary",
    titleColor: "text-primary",
  },
};

export function DashboardAIInsights({ boardId }: DashboardAIInsightsProps) {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-ai-insights", boardId],
    queryFn: async () => {
      if (!boardId) return { insights: [] };
      const { data, error } = await supabase.functions.invoke("dashboard-ai-insights", {
        body: { board_id: boardId },
      });
      if (error) throw error;
      return data as { insights: AIInsight[] };
    },
    enabled: !!boardId,
    staleTime: 60 * 60 * 1000, // 1 hour cache
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !data?.insights?.length) return null;

  const insights = data.insights;

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight, i) => {
        const config = typeConfig[insight.type] || typeConfig.info;
        const Icon = config.icon;
        return (
          <Card
            key={i}
            className={`p-3 md:p-4 border ${config.border} ${config.bg} transition-shadow hover:shadow-md`}
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-background/60 shrink-0">
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold leading-tight ${config.titleColor}`}>
                  {insight.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {insight.description}
                </p>
              </div>
            </div>
          </Card>
        );
      })}

      {/* CTA Card */}
      <Card className="p-3 md:p-4 border border-primary/30 bg-primary/5 flex flex-col justify-between transition-shadow hover:shadow-md">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary leading-tight">
              Resumo Completo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Gere uma análise detalhada com IA
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs"
          onClick={() => navigate("/board-summary")}
        >
          Gerar Resumo
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Card>
    </div>
  );
}
