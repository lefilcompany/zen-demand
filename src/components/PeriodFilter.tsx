import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";

export type PeriodType = "week" | "month" | "quarter";

interface PeriodFilterProps {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Tabs value={value} onValueChange={(v) => onChange(v as PeriodType)}>
        <TabsList className="h-8">
          <TabsTrigger value="week" className="text-xs px-3">
            Semana
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs px-3">
            Mês
          </TabsTrigger>
          <TabsTrigger value="quarter" className="text-xs px-3">
            Trimestre
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
