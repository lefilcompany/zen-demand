import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useTeamSubscription } from "@/hooks/useSubscription";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Crown, Sparkles, ArrowRight, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarSubscriptionCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { currentTeam } = useSelectedTeam();
  const { isTrialActive, daysRemaining, isLoading: trialLoading } = useTrialStatus();
  const { data: subscription, isLoading: subLoading } = useTeamSubscription(currentTeam?.id);

  const showText = isMobile || !isCollapsed;

  const handleClick = () => {
    navigate("/pricing");
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Don't show if still loading
  if (trialLoading || subLoading) return null;

  // Has active subscription - show current plan
  if (subscription?.status === "active" && subscription.plan) {
    // Collapsed state - show icon only
    if (!showText) {
      return (
        <button
          onClick={handleClick}
          className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 hover:border-primary/50 hover:from-primary/30 hover:to-primary/20 transition-all duration-200 group"
          title={subscription.plan.name}
        >
          <Crown className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
        </button>
      );
    }

    return (
      <button
        onClick={handleClick}
        className="w-full p-3 rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 hover:from-primary/20 hover:to-accent/15 transition-all duration-300 group text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{subscription.plan.name}</span>
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <span className="text-xs text-muted-foreground">Plano ativo</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>
    );
  }

  // Trial active - show trial status with urgency
  if (isTrialActive) {
    const getUrgencyLevel = () => {
      if (daysRemaining <= 3) return "critical";
      if (daysRemaining <= 7) return "warning";
      if (daysRemaining <= 14) return "attention";
      return "normal";
    };

    const urgency = getUrgencyLevel();

    const urgencyStyles = {
      critical: {
        bg: "from-destructive/20 via-destructive/15 to-destructive/10",
        border: "border-destructive/40 hover:border-destructive/60",
        icon: "from-destructive to-destructive/80",
        iconShadow: "shadow-destructive/30",
        text: "text-destructive",
      },
      warning: {
        bg: "from-amber-500/20 via-amber-500/15 to-amber-500/10",
        border: "border-amber-500/40 hover:border-amber-500/60",
        icon: "from-amber-500 to-amber-600",
        iconShadow: "shadow-amber-500/30",
        text: "text-amber-600 dark:text-amber-400",
      },
      attention: {
        bg: "from-primary/20 via-primary/15 to-primary/10",
        border: "border-primary/40 hover:border-primary/60",
        icon: "from-primary to-primary/80",
        iconShadow: "shadow-primary/30",
        text: "text-primary",
      },
      normal: {
        bg: "from-emerald-500/15 via-emerald-500/10 to-emerald-500/5",
        border: "border-emerald-500/30 hover:border-emerald-500/50",
        icon: "from-emerald-500 to-emerald-600",
        iconShadow: "shadow-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-400",
      },
    };

    const styles = urgencyStyles[urgency];

    // Collapsed state
    if (!showText) {
      return (
        <button
          onClick={handleClick}
          className={cn(
            "w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br border transition-all duration-200 group relative",
            styles.bg,
            styles.border
          )}
          title={`${daysRemaining} dias restantes`}
        >
          <Clock className={cn("h-4 w-4 group-hover:scale-110 transition-transform", styles.text)} />
          {urgency === "critical" && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
          )}
        </button>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={cn(
          "w-full p-3 rounded-xl bg-gradient-to-br border transition-all duration-300 group text-left relative overflow-hidden",
          styles.bg,
          styles.border
        )}
      >
        {/* Animated background for critical/warning */}
        {(urgency === "critical" || urgency === "warning") && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        )}
        
        <div className="relative flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg transition-shadow",
            styles.icon,
            styles.iconShadow
          )}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Período de Teste</span>
              {urgency === "critical" && (
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className={cn("text-xs font-medium", styles.text)}>
                {daysRemaining === 0 
                  ? "Último dia!" 
                  : daysRemaining === 1 
                    ? "1 dia restante" 
                    : `${daysRemaining} dias restantes`
                }
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={cn(
          "mt-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 group-hover:bg-background/80 transition-colors",
          urgency === "critical" && "bg-destructive/10 border-destructive/20",
          urgency === "warning" && "bg-amber-500/10 border-amber-500/20"
        )}>
          <Zap className={cn("h-4 w-4", styles.text)} />
          <span className={cn("text-xs font-medium", styles.text)}>
            {urgency === "critical" || urgency === "warning" ? "Assinar agora" : "Ver planos"}
          </span>
          <ArrowRight className={cn("h-3 w-3 group-hover:translate-x-0.5 transition-transform", styles.text)} />
        </div>
      </button>
    );
  }

  // No subscription and no trial - show upgrade prompt
  if (!showText) {
    return (
      <button
        onClick={handleClick}
        className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 hover:border-primary/50 hover:from-primary/30 hover:to-primary/20 transition-all duration-200 group animate-pulse"
        title="Escolher um plano"
      >
        <Crown className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-accent/15 border border-primary/30 hover:border-primary/50 transition-all duration-300 group text-left"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
          <Crown className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">Escolha um plano</span>
          <p className="text-xs text-muted-foreground">Desbloqueie todos os recursos</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">Ver planos</span>
        <ArrowRight className="h-3 w-3 text-primary group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}
