import { Clock, Play, Pause, Loader2, Users } from "lucide-react";
import { useLiveTimer, formatTimeDisplay } from "@/hooks/useLiveTimer";
import { useUserTimerControl, useDemandUserTimeStats } from "@/hooks/useUserTimeTracking";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface KanbanTimeDisplayProps {
  demandId: string;
  canControl?: boolean;
  forceShow?: boolean;
}

export function KanbanTimeDisplay({ demandId, canControl = false, forceShow = false }: KanbanTimeDisplayProps) {
  const { data: userStats } = useDemandUserTimeStats(demandId);
  const {
    isTimerRunning,
    totalSeconds,
    activeStartedAt,
    startTimer,
    stopTimer,
    isLoading,
  } = useUserTimerControl(demandId);

  // Current user's live time
  const currentUserLiveTime = useLiveTimer({
    isActive: isTimerRunning,
    baseSeconds: totalSeconds,
    lastStartedAt: activeStartedAt,
  });

  const activeUsersCount = userStats?.filter(u => u.isActive).length || 0;
  const displayTime = currentUserLiveTime || formatTimeDisplay(totalSeconds) || "00:00:00:00";

  // Don't show if no time tracked (unless forceShow is true)
  if (!forceShow && totalSeconds === 0 && !isTimerRunning && activeUsersCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1 mb-2 overflow-hidden min-w-0">
      <Clock className="h-3 w-3 shrink-0" />
      <span className="text-[10px] uppercase font-medium shrink-0">Execução:</span>
      <span className="font-mono font-medium truncate min-w-0">{displayTime}</span>
      {isTimerRunning && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      {canControl && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 shrink-0",
                  isTimerRunning 
                    ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 hover:text-amber-700" 
                    : "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 hover:text-emerald-700"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLoading) return;
                  if (isTimerRunning) {
                    stopTimer();
                  } else {
                    startTimer();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isTimerRunning ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isTimerRunning ? "Pausar timer" : "Iniciar timer"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {activeUsersCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 text-emerald-600 shrink-0">
                <Users className="h-3 w-3" />
                <span className="text-[10px]">{activeUsersCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{activeUsersCount} {activeUsersCount === 1 ? "pessoa" : "pessoas"} trabalhando</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
