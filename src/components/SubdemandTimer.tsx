import { Clock } from "lucide-react";
import { useLiveTimer, formatTimeDisplay } from "@/hooks/useLiveTimer";
import { useUserTimerControl } from "@/hooks/useUserTimeTracking";

interface SubdemandTimerProps {
  demandId: string;
}

export function SubdemandTimer({ demandId }: SubdemandTimerProps) {
  const {
    isTimerRunning,
    totalSeconds,
    activeStartedAt,
  } = useUserTimerControl(demandId);

  const liveTime = useLiveTimer({
    isActive: isTimerRunning,
    baseSeconds: totalSeconds,
    lastStartedAt: activeStartedAt,
  });

  const displayTime = liveTime || formatTimeDisplay(totalSeconds);

  if (!displayTime && !isTimerRunning) return null;

  return (
    <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{displayTime || "0h"}</span>
      {isTimerRunning && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      )}
    </div>
  );
}
