import { Shield, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriorityCardsProps {
  value: string;
  onChange: (value: string) => void;
}

const priorities = [
  {
    value: "baixa",
    label: "Baixa",
    icon: Shield,
    description: "Sem urgência, prazo flexível",
    colorClasses: {
      border: "border-emerald-500/60",
      bg: "bg-emerald-500/10",
      glow: "shadow-emerald-500/20",
      icon: "text-emerald-500",
      dot: "bg-emerald-500",
    },
  },
  {
    value: "média",
    label: "Média",
    icon: Clock,
    description: "Prazo padrão, atenção moderada",
    colorClasses: {
      border: "border-amber-500/60",
      bg: "bg-amber-500/10",
      glow: "shadow-amber-500/20",
      icon: "text-amber-500",
      dot: "bg-amber-500",
    },
  },
  {
    value: "alta",
    label: "Alta",
    icon: AlertTriangle,
    description: "Urgente, requer ação imediata",
    colorClasses: {
      border: "border-red-500/60",
      bg: "bg-red-500/10",
      glow: "shadow-red-500/20",
      icon: "text-red-500",
      dot: "bg-red-500",
    },
  },
];

export function PriorityCards({ value, onChange }: PriorityCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {priorities.map((p) => {
        const isSelected = value === p.value;
        const Icon = p.icon;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 cursor-pointer text-center",
              "bg-white/5 dark:bg-white/5 backdrop-blur-sm",
              isSelected
                ? cn(
                    p.colorClasses.border,
                    p.colorClasses.bg,
                    "shadow-lg",
                    p.colorClasses.glow,
                    "scale-[1.02]"
                  )
                : "border-white/10 hover:border-white/20 hover:bg-white/8 opacity-60 hover:opacity-80"
            )}
          >
            {/* Dot indicator */}
            {isSelected && (
              <span
                className={cn(
                  "absolute top-2 right-2 h-2 w-2 rounded-full",
                  p.colorClasses.dot
                )}
              />
            )}
            <div
              className={cn(
                "rounded-lg p-2 transition-colors",
                isSelected ? p.colorClasses.bg : "bg-muted/50"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isSelected ? p.colorClasses.icon : "text-muted-foreground"
                )}
              />
            </div>
            <span className="text-sm font-semibold">{p.label}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              {p.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
