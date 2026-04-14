import { useState } from "react";
import { useSubdemands } from "@/hooks/useSubdemands";
import { cn } from "@/lib/utils";

interface KanbanSubdemandsListProps {
  demandId: string;
  onSubdemandClick?: (id: string) => void;
}

const MAX_VISIBLE = 2;

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
              className="px-2.5 py-1 text-[11px] font-medium text-white truncate"
              style={{ backgroundColor: color }}
            >
              {sub.title.toUpperCase()}
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
