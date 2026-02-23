import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [pickerView, setPickerView] = React.useState<"days" | "months" | "years">("days");
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    props.selected instanceof Date ? props.selected : props.defaultMonth || new Date()
  );

  const currentYear = displayMonth.getFullYear();
  const currentMonth = displayMonth.getMonth();

  const fromDate = props.fromDate;
  const toYear = props.toYear || currentYear + 10;
  const fromYear = fromDate ? fromDate.getFullYear() : currentYear - 5;

  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = fromYear; y <= toYear; y++) arr.push(y);
    return arr;
  }, [fromYear, toYear]);

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(displayMonth, monthIndex);
    setDisplayMonth(newDate);
    setPickerView("days");
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(displayMonth, year);
    setDisplayMonth(newDate);
    setPickerView("months");
  };

  const handleMonthChange = (date: Date) => {
    setDisplayMonth(date);
  };

  const isMonthDisabled = (monthIndex: number) => {
    if (!fromDate) return false;
    if (currentYear < fromDate.getFullYear()) return true;
    if (currentYear === fromDate.getFullYear() && monthIndex < fromDate.getMonth()) return true;
    return false;
  };

  const isYearDisabled = (year: number) => {
    if (fromDate && year < fromDate.getFullYear()) return true;
    return false;
  };

  // Month grid view
  if (pickerView === "months") {
    return (
      <div className={cn("p-3 pointer-events-auto w-[280px]", className)}>
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setDisplayMonth(setYear(displayMonth, currentYear - 1))}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
            disabled={isYearDisabled(currentYear - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPickerView("years")}
            className="text-sm font-semibold hover:text-primary-foreground transition-colors cursor-pointer px-3 py-1.5 rounded-full hover:bg-primary/90"
          >
            {currentYear}
          </button>
          <button
            type="button"
            onClick={() => setDisplayMonth(setYear(displayMonth, currentYear + 1))}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
            disabled={currentYear + 1 > toYear}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS_PT.map((name, i) => {
            const disabled = isMonthDisabled(i);
            const isActive = i === currentMonth;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleMonthSelect(i)}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-primary/15 hover:text-primary text-foreground",
                  disabled && "text-muted-foreground opacity-40 cursor-not-allowed"
                )}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Year grid view - decades (e.g. 2020-2029, 2030-2039)
  if (pickerView === "years") {
    const decadeStart = Math.floor(currentYear / 10) * 10;
    const decadeEnd = decadeStart + 9;
    const visibleYears = years.filter(y => y >= decadeStart && y <= decadeEnd);
    const canGoPrev = years.some(y => y < decadeStart);
    const canGoNext = years.some(y => y > decadeEnd);

    return (
      <div className={cn("p-3 pointer-events-auto w-[280px]", className)}>
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setDisplayMonth(setYear(displayMonth, currentYear - 10))}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {decadeStart} – {decadeEnd}
          </span>
          <button
            type="button"
            onClick={() => setDisplayMonth(setYear(displayMonth, currentYear + 10))}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            )}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {visibleYears.map((year) => {
            const disabled = isYearDisabled(year);
            const isActive = year === currentYear;
            return (
              <button
                key={year}
                type="button"
                disabled={disabled}
                onClick={() => handleYearSelect(year)}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-primary/15 hover:text-primary text-foreground",
                  disabled && "text-muted-foreground opacity-40 cursor-not-allowed"
                )}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Days view with custom caption
  const captionLabel = format(displayMonth, "MMMM yyyy", { locale: ptBR });
  const capitalizedCaption = captionLabel.charAt(0).toUpperCase() + captionLabel.slice(1);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      month={displayMonth}
      onMonthChange={handleMonthChange}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold cursor-pointer hover:text-primary transition-colors",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        CaptionLabel: ({ ..._props }) => (
          <button
            type="button"
            onClick={() => setPickerView("months")}
            className="text-sm font-semibold cursor-pointer hover:text-primary-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-primary/90"
          >
            {capitalizedCaption}
          </button>
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
