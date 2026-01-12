import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLiveTimer, formatTimeDisplay } from "@/hooks/useLiveTimer";
import { BoardUserTimeStats } from "@/hooks/useBoardTimeEntries";
import { cn } from "@/lib/utils";

interface LiveUserTimeRowProps {
  stats: BoardUserTimeStats;
  maxTime: number;
  rank: number;
}

export function LiveUserTimeRow({ stats, maxTime, rank }: LiveUserTimeRowProps) {
  // Use live timer for active users
  const liveTime = useLiveTimer({
    isActive: stats.isActive,
    baseSeconds: stats.totalSeconds,
    lastStartedAt: stats.activeStartedAt,
  });

  // Calculate live total for progress bar
  const liveSeconds = useMemo(() => {
    if (!stats.isActive || !stats.activeStartedAt) {
      return stats.totalSeconds;
    }
    const elapsed = Math.floor((Date.now() - new Date(stats.activeStartedAt).getTime()) / 1000);
    return stats.totalSeconds + elapsed;
  }, [stats.isActive, stats.activeStartedAt, stats.totalSeconds]);

  const progressPercent = maxTime > 0 ? (liveSeconds / maxTime) * 100 : 0;

  const initials = stats.profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm">
        {rank}
      </div>
      
      <Link to={`/user/${stats.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={stats.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {stats.isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{stats.profile.full_name}</span>
            {stats.isActive && (
              <Badge 
                variant="secondary" 
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 shrink-0"
              >
                <Play className="h-3 w-3 fill-current" />
                Ativo
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {stats.demandCount} demanda{stats.demandCount !== 1 ? 's' : ''}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4 shrink-0">
        <div className="w-32 hidden sm:block">
          <Progress 
            value={Math.min(progressPercent, 100)} 
            className={cn("h-2", stats.isActive && "animate-pulse")}
          />
        </div>
        
        <div className={cn(
          "font-mono font-bold text-lg tabular-nums w-[130px] text-right",
          stats.isActive && "text-emerald-600 dark:text-emerald-400"
        )}>
          {liveTime || formatTimeDisplay(stats.totalSeconds) || "00:00:00:00"}
        </div>
      </div>
    </div>
  );
}
