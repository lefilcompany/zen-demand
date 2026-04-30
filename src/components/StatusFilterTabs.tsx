import { useMemo } from "react";
import { useBoardStatuses } from "@/hooks/useBoardStatuses";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { cn } from "@/lib/utils";

// Ordem fixa dos status do sistema
const STATUS_ORDER = [
  "A Iniciar",
  "Tarefas Internas",
  "Fazendo",
  "Em Ajuste",
  "Aprovação Interna",
  "Aprovação do Cliente",
  "Entregue",
  "Atrasado",
];

// Status hidden from requesters
const REQUESTER_HIDDEN_STATUSES = ["Tarefas Internas"];

interface StatusFilterTabsProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  // Multi-select API (preferred when provided)
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  multiSelect?: boolean;
}

export function StatusFilterTabs({ value, onChange, values, onValuesChange, multiSelect }: StatusFilterTabsProps) {
  const isMulti = multiSelect ?? Array.isArray(values);
  const selectedSet = new Set(isMulti ? (values ?? []) : value ? [value] : []);
  const isAllSelected = selectedSet.size === 0;

  const handleAllClick = () => {
    if (isMulti) onValuesChange?.([]);
    else onChange?.(null);
  };

  const handleStatusClick = (statusId: string) => {
    if (isMulti) {
      const next = new Set(selectedSet);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      onValuesChange?.(Array.from(next));
    } else {
      // Single-select toggle: clicking the active one clears it
      onChange?.(value === statusId ? null : statusId);
    }
  };

  // Ordenar status conforme ordem definida, usando os status do quadro atual
  const orderedStatuses = useMemo(() => {
    if (!boardStatuses) return [];
    
    // Converter para formato esperado (id, name, color)
    let statuses = boardStatuses.map(bs => ({
      id: bs.status.id,
      name: bs.status.name,
      color: bs.status.color,
    }));
    
    // Hide statuses from requesters
    if (boardRole === "requester") {
      statuses = statuses.filter(s => !REQUESTER_HIDDEN_STATUSES.includes(s.name));
    }
    
    return statuses.sort((a, b) => {
      const indexA = STATUS_ORDER.indexOf(a.name);
      const indexB = STATUS_ORDER.indexOf(b.name);
      // Se não encontrar na lista, coloca no final
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;
      return orderA - orderB;
    });
  }, [boardStatuses, boardRole]);

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap shrink-0",
          "border border-border hover:bg-accent",
          !value && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
        )}
      >
        Todos
      </button>
      {orderedStatuses.map((status) => {
        // Abreviar nomes longos no mobile
        const shortName = status.name === "Aprovação do Cliente" ? "Aprovação" : status.name;
        
        return (
          <button
            key={status.id}
            onClick={() => onChange(status.id)}
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0",
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
                "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0",
                value === status.id && "bg-white/80"
              )}
              style={{
                backgroundColor: value !== status.id ? status.color : undefined,
              }}
            />
            <span className="hidden sm:inline">{status.name}</span>
            <span className="sm:hidden">{shortName}</span>
          </button>
        );
      })}
    </div>
  );
}
