import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScopeProgressBarProps {
  used: number;
  limit: number;
  className?: string;
}

export function ScopeProgressBar({ used, limit, className }: ScopeProgressBarProps) {
  if (limit === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Demandas este mês</span>
          <span className="font-medium">{used} demandas</span>
        </div>
        <div className="text-xs text-muted-foreground">Sem limite definido</div>
      </div>
    );
  }

  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(limit - used, 0);
  
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-orange-500";
    return "bg-primary";
  };

  const getStatusText = () => {
    if (percentage >= 100) return "Limite atingido";
    if (percentage >= 80) return "Próximo do limite";
    return `Restam ${remaining} demandas`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Uso do plano mensal</span>
        <span className="font-medium">
          {used}/{limit} demandas ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="relative">
        <Progress 
          value={percentage} 
          className="h-3"
        />
        <div 
          className={cn(
            "absolute inset-0 h-3 rounded-full transition-all",
            getProgressColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={cn(
        "text-xs",
        percentage >= 100 ? "text-destructive font-medium" : 
        percentage >= 80 ? "text-orange-500" : "text-muted-foreground"
      )}>
        {getStatusText()}
      </div>
    </div>
  );
}
