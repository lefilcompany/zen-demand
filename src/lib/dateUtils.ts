import { addHours, addDays, isSaturday, isSunday, format, getYear } from "date-fns";

/**
 * Get Brazilian national holidays for a given year
 * Includes fixed holidays and calculates Easter-based holidays
 */
const getBrazilianHolidays = (year: number): Date[] => {
  // Calculate Easter Sunday using Anonymous Gregorian algorithm
  const calculateEaster = (y: number): Date => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month, day);
  };

  const easter = calculateEaster(year);
  
  // Easter-based holidays
  const carnival = addDays(easter, -47); // Carnaval (terça-feira)
  const carnivalMonday = addDays(easter, -48); // Segunda de Carnaval
  const goodFriday = addDays(easter, -2); // Sexta-feira Santa
  const corpusChristi = addDays(easter, 60); // Corpus Christi

  // Fixed national holidays
  const holidays: Date[] = [
    new Date(year, 0, 1),   // Ano Novo
    carnivalMonday,         // Segunda de Carnaval
    carnival,               // Terça de Carnaval
    goodFriday,             // Sexta-feira Santa
    new Date(year, 3, 21),  // Tiradentes
    new Date(year, 4, 1),   // Dia do Trabalho
    corpusChristi,          // Corpus Christi
    new Date(year, 8, 7),   // Independência do Brasil
    new Date(year, 9, 12),  // Nossa Senhora Aparecida
    new Date(year, 10, 2),  // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 11, 25), // Natal
  ];

  return holidays;
};

/**
 * Check if a date is a Brazilian national holiday
 */
const isHoliday = (date: Date): boolean => {
  const year = getYear(date);
  const holidays = getBrazilianHolidays(year);
  
  return holidays.some(holiday => 
    holiday.getFullYear() === date.getFullYear() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getDate() === date.getDate()
  );
};

/**
 * Check if a date is a business day (not weekend and not holiday)
 */
const isBusinessDay = (date: Date): boolean => {
  return !isSaturday(date) && !isSunday(date) && !isHoliday(date);
};

/**
 * Move date to next business day if it falls on weekend or holiday
 */
export const getNextBusinessDay = (date: Date): Date => {
  let result = date;
  while (!isBusinessDay(result)) {
    result = addDays(result, 1);
  }
  return result;
};

/**
 * Calculate due date based on estimated hours, ensuring it falls on a business day
 */
export const calculateBusinessDueDate = (estimatedHours: number): Date => {
  const dueDate = addHours(new Date(), estimatedHours);
  return getNextBusinessDay(dueDate);
};

/**
 * Format a due date for display (dd/MM/yyyy HH:mm)
 */
export const formatDueDate = (date: Date): string => {
  return format(date, "dd/MM/yyyy HH:mm");
};

/**
 * Format a due date for form input (yyyy-MM-dd)
 */
export const formatDueDateForInput = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};
