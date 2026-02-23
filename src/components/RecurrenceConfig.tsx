import { useState } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Repeat, CalendarDays, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecurrenceData {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  weekdays: number[];
  dayOfMonth: number | null;
  startDate: string;
  endDate: string;
}

interface RecurrenceConfigProps {
  value: RecurrenceData;
  onChange: (data: RecurrenceData) => void;
  compact?: boolean;
}

const WEEKDAY_LABELS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

export const defaultRecurrenceData: RecurrenceData = {
  enabled: false,
  frequency: "daily",
  weekdays: [1, 2, 3, 4, 5],
  dayOfMonth: 1,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateStr(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

export function RecurrenceConfig({ value, onChange, compact = false }: RecurrenceConfigProps) {
  const update = (partial: Partial<RecurrenceData>) => {
    onChange({ ...value, ...partial });
  };

  const startDateObj = parseDate(value.startDate);
  const endDateObj = parseDate(value.endDate);

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <div>
            <Label htmlFor="recurrence-toggle" className="text-sm font-medium cursor-pointer">
              Repetir demanda
            </Label>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                Crie automaticamente esta demanda de forma recorrente
              </p>
            )}
          </div>
        </div>
        <Switch
          id="recurrence-toggle"
          checked={value.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      {value.enabled && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select
              value={value.frequency}
              onValueChange={(v) => update({ frequency: v as RecurrenceData["frequency"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weekly: weekday checkboxes */}
          {value.frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Dias da semana</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((day) => (
                  <label
                    key={day.value}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                      value.weekdays.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={value.weekdays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        const newDays = checked
                          ? [...value.weekdays, day.value].sort()
                          : value.weekdays.filter((d) => d !== day.value);
                        update({ weekdays: newDays });
                      }}
                      className="sr-only"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Monthly: day of month */}
          {value.frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Dia do mês</Label>
              <Select
                value={String(value.dayOfMonth || 1)}
                onValueChange={(v) => update({ dayOfMonth: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_MONTH.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date range with Calendar Popovers */}
          <div className={compact ? "space-y-3" : "grid grid-cols-2 gap-4"}>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Data de início *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDateObj && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDateObj
                      ? format(startDateObj, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDateObj}
                    onSelect={(date) => update({ startDate: formatDateStr(date) })}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Data de fim (opcional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDateObj && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDateObj
                      ? format(endDateObj, "dd/MM/yyyy", { locale: ptBR })
                      : "Sem data de fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDateObj}
                    onSelect={(date) => update({ endDate: formatDateStr(date) })}
                    disabled={(date) =>
                      startDateObj ? date < startDateObj : false
                    }
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            {value.frequency === "daily" && "Uma nova demanda será criada todos os dias."}
            {value.frequency === "weekly" &&
              (value.weekdays.length > 0
                ? `Demandas serão criadas: ${value.weekdays
                    .sort()
                    .map((d) => WEEKDAY_LABELS.find((l) => l.value === d)?.label)
                    .join(", ")}`
                : "Selecione pelo menos um dia da semana.")}
            {value.frequency === "monthly" &&
              `Uma nova demanda será criada todo dia ${value.dayOfMonth || 1} de cada mês.`}
          </p>
        </div>
      )}
    </div>
  );
}
