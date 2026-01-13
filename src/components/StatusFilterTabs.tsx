import { useMemo } from "react";
import { useDemandStatuses } from "@/hooks/useDemands";
import { cn } from "@/lib/utils";

// Ordem fixa dos status
const STATUS_ORDER = [
  "A Iniciar",
  "Fazendo",
  "Em Ajuste",
  "Aprovação do Cliente",
  "Entregue",
  "Atrasado",
];

interface StatusFilterTabsProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function StatusFilterTabs({ value, onChange }: StatusFilterTabsProps) {
  const { data: statuses } = useDemandStatuses();

  // Ordenar status conforme ordem definida
  const orderedStatuses = useMemo(() => {
    if (!statuses) return [];
    return [...statuses].sort((a, b) => {
      const indexA = STATUS_ORDER.indexOf(a.name);
      const indexB = STATUS_ORDER.indexOf(b.name);
      // Se não encontrar na lista, coloca no final
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;
      return orderA - orderB;
    });
  }, [statuses]);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          "border border-border hover:bg-accent",
          !value && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
        )}
      >
        Todos
      </button>
      {orderedStatuses.map((status) => (
        <button
          key={status.id}
          onClick={() => onChange(status.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
            "border hover:opacity-80",
            value === status.id
              ? "text-white"
              : "bg-background/50 text-foreground"
          )}
          style={{
            backgroundColor: value === status.id ? status.color : undefined,
            borderColor: status.color,
          }}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              value === status.id && "bg-white/80"
            )}
            style={{
              backgroundColor: value !== status.id ? status.color : undefined,
            }}
          />
          {status.name}
        </button>
      ))}
    </div>
  );
}
