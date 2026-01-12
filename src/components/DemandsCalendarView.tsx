import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDemandCard } from "@/components/CalendarDemandCard";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Demand {
  id: string;
  title: string;
  priority?: string | null;
  due_date?: string | null;
  demand_statuses?: {
    name: string;
    color: string;
  } | null;
}

interface DemandsCalendarViewProps {
  demands: Demand[];
  onDemandClick: (demandId: string) => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_VISIBLE_DEMANDS = 3;

export function DemandsCalendarView({
  demands,
  onDemandClick,
  onDayClick,
}: DemandsCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group demands by date
  const demandsByDate = useMemo(() => {
    const grouped: Record<string, Demand[]> = {};
    demands.forEach((demand) => {
      if (demand.due_date) {
        const dateKey = format(new Date(demand.due_date), "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(demand);
      }
    });
    return grouped;
  }, [demands]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/20">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayDemands = demandsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const hasMoreDemands = dayDemands.length > MAX_VISIBLE_DEMANDS;
          const visibleDemands = dayDemands.slice(0, MAX_VISIBLE_DEMANDS);
          const hiddenCount = dayDemands.length - MAX_VISIBLE_DEMANDS;

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[120px] sm:min-h-[140px] border-b border-r border-border p-1 sm:p-2 transition-colors",
                "hover:bg-muted/30 cursor-pointer",
                !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                index % 7 === 0 && "border-l-0",
                index < 7 && "border-t-0"
              )}
              onClick={() => onDayClick(day)}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isTodayDate &&
                      "bg-primary text-primary-foreground font-bold",
                    !isCurrentMonth && "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayDemands.length > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {dayDemands.length} {dayDemands.length === 1 ? "demanda" : "demandas"}
                  </span>
                )}
              </div>

              {/* Demands List */}
              <div className="space-y-1">
                {visibleDemands.map((demand) => (
                  <CalendarDemandCard
                    key={demand.id}
                    demand={demand}
                    onClick={() => onDemandClick(demand.id)}
                  />
                ))}

                {/* More demands indicator */}
                {hasMoreDemands && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1 hover:bg-primary/5 rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        +{hiddenCount} mais
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-72 p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mb-2 font-medium text-sm">
                        {format(day, "d 'de' MMMM", { locale: ptBR })}
                      </div>
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-1">
                          {dayDemands.map((demand) => (
                            <CalendarDemandCard
                              key={demand.id}
                              demand={demand}
                              onClick={() => onDemandClick(demand.id)}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Add demand button (visible on hover) */}
              {dayDemands.length === 0 && (
                <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity -mt-6">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
