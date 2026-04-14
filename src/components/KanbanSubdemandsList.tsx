import { useState } from "react";
import { useSubdemands } from "@/hooks/useSubdemands";
import { AssigneeAvatars } from "@/components/AssigneeAvatars";
import { formatDemandCode } from "@/lib/demandCodeUtils";
import { cn } from "@/lib/utils";

interface KanbanSubdemandsListProps {
  demandId: string;
  onSubdemandClick?: (id: string) => void;
}

const MAX_VISIBLE = 2;

function formatTimeSeconds(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

export function KanbanSubdemandsList({ demandId, onSubdemandClick }: KanbanSubdemandsListProps) {
  const { data: subdemands } = useSubdemands(demandId);
  const [expanded, setExpanded] = useState(false);

  if (!subdemands || subdemands.length === 0) return null;

  const visible = expanded ? subdemands : subdemands.slice(0, MAX_VISIBLE);
  const hiddenCount = subdemands.length - MAX_VISIBLE;

  return (
    <div className="mt-2 space-y-1.5">
      {visible.map((sub) => {
        const color = sub.demand_statuses?.color || "#6B7280";
        const statusName = sub.demand_statuses?.name || "Sem status";
        const assignees = sub.demand_assignees || [];
        const timeStr = formatTimeSeconds(sub.time_in_progress_seconds);
        const code = sub.board_sequence_number ? formatDemandCode(sub.board_sequence_number) : null;

        return (
          <button
            key={sub.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubdemandClick?.(sub.id);
            }}
            className="w-full rounded-md overflow-hidden text-left transition-opacity hover:opacity-80"
            title={`${sub.title} — ${statusName}`}
          >
            <div
              className="px-2.5 py-1.5 flex items-center gap-1.5"
              style={{ backgroundColor: color }}
            >
              <span className="text-[11px] font-medium text-white truncate flex-1">
                {code && <span className="opacity-70 mr-1">{code}</span>}
                {sub.title.toUpperCase()}
              </span>
              {timeStr && (
                <span className="text-[10px] text-white/80 font-mono shrink-0">
                  {timeStr}
                </span>
              )}
              {assignees.length > 0 && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <AssigneeAvatars assignees={assignees} size="xs" maxVisible={2} />
                </div>
              )}
            </div>
          </button>
        );
      })}
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-xs text-primary font-medium hover:underline w-full text-center"
        >
          Ver mais ({hiddenCount})
        </button>
      )}
      {expanded && subdemands.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-xs text-muted-foreground hover:underline w-full text-center"
        >
          Ver menos
        </button>
      )}
    </div>
  );
}
