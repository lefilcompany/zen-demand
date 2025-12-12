import { Calendar, Clock } from "lucide-react";
import { useLiveTimer, getTotalTimeSinceCreation, formatTimeDisplay } from "@/hooks/useLiveTimer";

interface DemandTimeDisplayProps {
  createdAt?: string;
  updatedAt?: string;
  timeInProgressSeconds?: number | null;
  lastStartedAt?: string | null;
  isInProgress?: boolean;
  isDelivered?: boolean;
  variant?: "card" | "detail" | "table";
}

export function DemandTimeDisplay({
  createdAt,
  updatedAt,
  timeInProgressSeconds,
  lastStartedAt,
  isInProgress = false,
  isDelivered = false,
  variant = "card",
}: DemandTimeDisplayProps) {
  // Live timer for execution time when in "Fazendo"
  const liveExecutionTime = useLiveTimer({
    isActive: isInProgress,
    baseSeconds: timeInProgressSeconds || 0,
    lastStartedAt,
  });

  // Calculate total time (from creation to delivery or now)
  const totalTime = isDelivered
    ? getTotalTimeSinceCreation(createdAt, updatedAt)
    : getTotalTimeSinceCreation(createdAt);

  // For delivered demands, show static execution time
  const executionTime = isDelivered
    ? formatTimeDisplay(timeInProgressSeconds || 0)
    : liveExecutionTime;

  // Don't show anything if both are null/zero
  if (!totalTime && !executionTime) return null;

  if (variant === "table") {
    return (
      <div className="flex flex-col gap-0.5 text-xs">
        {executionTime && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{executionTime}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="flex flex-wrap gap-3">
        {totalTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
            <Calendar className="h-4 w-4" />
            <span className="text-xs uppercase font-medium">Total:</span>
            <span className="font-mono font-medium">{totalTime}</span>
          </div>
        )}
        {executionTime && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-3 py-1.5">
            <Clock className="h-4 w-4" />
            <span className="text-xs uppercase font-medium">Execução:</span>
            <span className="font-mono font-medium">{executionTime}</span>
            {isInProgress && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className="flex flex-col gap-1 mb-2">
      {totalTime && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
          <Calendar className="h-3 w-3" />
          <span className="text-[10px] uppercase font-medium">Total:</span>
          <span className="font-mono font-medium">{totalTime}</span>
        </div>
      )}
      {executionTime && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1">
          <Clock className="h-3 w-3" />
          <span className="text-[10px] uppercase font-medium">Execução:</span>
          <span className="font-mono font-medium">{executionTime}</span>
          {isInProgress && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
