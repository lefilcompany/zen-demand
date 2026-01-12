import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDemandCard } from "@/components/CalendarDemandCard";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  isRequester?: boolean;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MAX_VISIBLE_DEMANDS_MONTH = 3;
const MAX_VISIBLE_DEMANDS_WEEK = 5;

type CalendarViewMode = "day" | "week" | "month";

interface SelectedDaySheet {
  date: Date;
  demands: Demand[];
}

export function DemandsCalendarView({
  demands,
  onDemandClick,
  onDayClick,
  isRequester = false,
}: DemandsCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedDaySheet, setSelectedDaySheet] = useState<SelectedDaySheet | null>(null);

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

  // Generate calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === "day") {
      return [startOfDay(currentDate)];
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
  }, [currentDate, viewMode]);

  // Navigation handlers
  const goToPrevious = () => {
    if (viewMode === "day") {
      setCurrentDate(subDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get header title based on view mode
  const getHeaderTitle = () => {
    if (viewMode === "day") {
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "d", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMMM yyyy", { locale: ptBR })}`;
      }
      return `${format(weekStart, "d MMM", { locale: ptBR })} - ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`;
    } else {
      return format(currentDate, "MMMM yyyy", { locale: ptBR });
    }
  };

  const renderDayView = () => {
    const day = calendarDays[0];
    const dateKey = format(day, "yyyy-MM-dd");
    const dayDemands = demandsByDate[dateKey] || [];
    const today = startOfDay(new Date());
    const isPastDay = isBefore(day, today);

    return (
      <div className="min-h-[500px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">
            {dayDemands.length} {dayDemands.length === 1 ? "demanda" : "demandas"}
          </h3>
          {!isPastDay && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDayClick(day)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {isRequester ? "Nova solicitação" : "Nova demanda"}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[450px]">
          <div className="space-y-2">
            {dayDemands.length === 0 ? (
              isPastDay ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <p>Nenhuma demanda para este dia</p>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center h-[300px] text-muted-foreground cursor-pointer hover:bg-muted/30 rounded-lg transition-colors"
                  onClick={() => onDayClick(day)}
                >
                  <Plus className="h-8 w-8 mb-2" />
                  <p>Nenhuma demanda para este dia</p>
                  <p className="text-sm">Clique para {isRequester ? "solicitar" : "adicionar"}</p>
                </div>
              )
            ) : (
              dayDemands.map((demand) => (
                <div key={demand.id} className="p-2 border rounded-lg hover:bg-muted/30 transition-colors">
                  <CalendarDemandCard
                    demand={demand}
                    onClick={() => onDemandClick(demand.id)}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderWeekView = () => {
    const today = startOfDay(new Date());

    return (
      <div className="grid grid-cols-7">
        {/* Weekday Headers */}
        {WEEKDAYS_FULL.map((day, index) => (
          <div
            key={day}
            className="py-2 px-1 text-center text-xs font-medium text-muted-foreground border-b border-border"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{WEEKDAYS[index]}</span>
          </div>
        ))}

        {/* Week Days */}
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayDemands = demandsByDate[dateKey] || [];
          const isTodayDate = isToday(day);
          const isPastDay = isBefore(day, today);
          const hasMoreDemands = dayDemands.length > MAX_VISIBLE_DEMANDS_WEEK;
          const visibleDemands = dayDemands.slice(0, MAX_VISIBLE_DEMANDS_WEEK);
          const hiddenCount = dayDemands.length - MAX_VISIBLE_DEMANDS_WEEK;

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[200px] border-b border-r border-border p-1 sm:p-2 transition-colors",
                !isPastDay && "hover:bg-muted/30 cursor-pointer",
                isPastDay && "bg-muted/10 opacity-70"
              )}
              onClick={() => !isPastDay && onDayClick(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isTodayDate && "bg-primary text-primary-foreground font-bold",
                    isPastDay && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayDemands.length > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {dayDemands.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {visibleDemands.map((demand) => (
                  <CalendarDemandCard
                    key={demand.id}
                    demand={demand}
                    onClick={() => onDemandClick(demand.id)}
                  />
                ))}

                {hasMoreDemands && (
                  <button
                    className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1 hover:bg-primary/5 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDaySheet({ date: day, demands: dayDemands });
                    }}
                  >
                    +{hiddenCount} mais
                  </button>
                )}
              </div>

              {dayDemands.length === 0 && !isPastDay && (
                <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity -mt-6">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const today = startOfDay(new Date());

    return (
      <>
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
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const isPastDay = isBefore(day, today);
            const hasMoreDemands = dayDemands.length > MAX_VISIBLE_DEMANDS_MONTH;
            const visibleDemands = dayDemands.slice(0, MAX_VISIBLE_DEMANDS_MONTH);
            const hiddenCount = dayDemands.length - MAX_VISIBLE_DEMANDS_MONTH;

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-[120px] sm:min-h-[140px] border-b border-r border-border p-1 sm:p-2 transition-colors",
                  !isPastDay && "hover:bg-muted/30 cursor-pointer",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                  isPastDay && "bg-muted/10 opacity-70",
                  index % 7 === 0 && "border-l-0",
                  index < 7 && "border-t-0"
                )}
                onClick={() => !isPastDay && onDayClick(day)}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      isTodayDate &&
                        "bg-primary text-primary-foreground font-bold",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isPastDay && "text-muted-foreground"
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
                    <button
                      className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1 hover:bg-primary/5 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDaySheet({ date: day, demands: dayDemands });
                      }}
                    >
                      +{hiddenCount} mais
                    </button>
                  )}
                </div>

                {/* Add demand button (visible on hover) */}
                {dayDemands.length === 0 && !isPastDay && (
                  <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity -mt-6">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-foreground capitalize order-first sm:order-none">
          {getHeaderTitle()}
        </h2>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as CalendarViewMode)}
          className="bg-muted/50 rounded-md p-1"
        >
          <ToggleGroupItem value="day" aria-label="Visão diária" className="text-xs px-3">
            Dia
          </ToggleGroupItem>
          <ToggleGroupItem value="week" aria-label="Visão semanal" className="text-xs px-3">
            Semana
          </ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Visão mensal" className="text-xs px-3">
            Mês
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Calendar Content */}
      {viewMode === "day" && renderDayView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "month" && renderMonthView()}

      {/* Side Sheet for more demands */}
      <Sheet open={!!selectedDaySheet} onOpenChange={(open) => !open && setSelectedDaySheet(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="capitalize">
              {selectedDaySheet && format(selectedDaySheet.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {selectedDaySheet?.demands.length} {selectedDaySheet?.demands.length === 1 ? "demanda" : "demandas"}
              </span>
              {selectedDaySheet && !isBefore(selectedDaySheet.date, startOfDay(new Date())) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedDaySheet) {
                      onDayClick(selectedDaySheet.date);
                      setSelectedDaySheet(null);
                    }
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {isRequester ? "Nova solicitação" : "Nova demanda"}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="space-y-2 pr-4">
                {selectedDaySheet?.demands.map((demand) => (
                  <div 
                    key={demand.id} 
                    className="p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      onDemandClick(demand.id);
                      setSelectedDaySheet(null);
                    }}
                  >
                    <CalendarDemandCard
                      demand={demand}
                      onClick={() => {
                        onDemandClick(demand.id);
                        setSelectedDaySheet(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
