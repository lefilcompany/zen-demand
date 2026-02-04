import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChartPeriodType = "month" | "3months" | "6months" | "year" | "all";

interface ChartPeriodSelectorProps {
  value: ChartPeriodType;
  onChange: (period: ChartPeriodType) => void;
  className?: string;
}

const PERIOD_OPTIONS: { value: ChartPeriodType; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "3months", label: "3 meses" },
  { value: "6months", label: "6 meses" },
  { value: "year", label: "1 ano" },
  { value: "all", label: "Tudo" },
];

export function ChartPeriodSelector({ value, onChange, className }: ChartPeriodSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1 hidden sm:block" />
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-6 px-2 text-[10px] font-medium",
            value === option.value && "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// Utility function to get date range from period
export function getChartPeriodRange(period: ChartPeriodType): { start: Date | null; end: Date } {
  const now = new Date();
  const end = now;

  switch (period) {
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end,
      };
    case "3months":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        end,
      };
    case "6months":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        end,
      };
    case "year":
      return {
        start: new Date(now.getFullYear() - 1, now.getMonth(), 1),
        end,
      };
    case "all":
      return {
        start: null, // No start limit
        end,
      };
  }
}
