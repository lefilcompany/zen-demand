import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Play, Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLiveTimer, formatTimeDisplay } from "@/hooks/useLiveTimer";
import { BoardUserTimeStats } from "@/hooks/useBoardTimeEntries";
import { cn } from "@/lib/utils";

interface LiveUserTimeRowProps {
  stats: BoardUserTimeStats;
  rank: number;
}

export function LiveUserTimeRow({ stats, rank }: LiveUserTimeRowProps) {
  // Use live timer for active users
  const liveTime = useLiveTimer({
    isActive: stats.isActive,
    baseSeconds: stats.totalSeconds,
    lastStartedAt: stats.activeStartedAt,
  });

  const initials = stats.profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Rank badge/medal styling
  const getRankElement = () => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
          <Trophy className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md">
          <Medal className="h-5 w-5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md">
          <Award className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-bold text-lg">
        {rank}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl transition-all",
      rank === 1 && "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200/50 dark:border-amber-800/30",
      rank === 2 && "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border border-slate-200/50 dark:border-slate-800/30",
      rank === 3 && "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200/50 dark:border-orange-800/30",
      rank > 3 && "hover:bg-muted/50 border border-transparent"
    )}>
      {getRankElement()}
      
      <Link to={`/user/${stats.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative shrink-0">
          <Avatar className={cn(
            "h-11 w-11 ring-2 ring-offset-2 ring-offset-background",
            stats.isActive ? "ring-emerald-500" : "ring-transparent"
          )}>
            <AvatarImage src={stats.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {stats.isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full flex items-center justify-center">
              <Play className="h-2 w-2 fill-white text-white" />
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold truncate",
              rank === 1 && "text-amber-700 dark:text-amber-400"
            )}>
              {stats.profile.full_name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{stats.demandCount} demanda{stats.demandCount !== 1 ? 's' : ''}</span>
            {stats.isActive && (
              <Badge 
                variant="secondary" 
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 h-5 text-[10px] px-1.5"
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Trabalhando
              </Badge>
            )}
          </div>
        </div>
      </Link>

      <div className={cn(
        "font-mono font-bold text-xl tabular-nums text-right shrink-0",
        stats.isActive && "text-emerald-600 dark:text-emerald-400",
        rank === 1 && !stats.isActive && "text-amber-700 dark:text-amber-400"
      )}>
        {liveTime || formatTimeDisplay(stats.totalSeconds) || "00:00:00:00"}
      </div>
    </div>
  );
}
