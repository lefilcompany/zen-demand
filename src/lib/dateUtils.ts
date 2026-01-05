import { addHours, addDays, isSaturday, isSunday, format } from "date-fns";

/**
 * Move date to next business day if it falls on weekend
 */
export const getNextBusinessDay = (date: Date): Date => {
  if (isSaturday(date)) {
    return addDays(date, 2); // Saturday -> Monday
  }
  if (isSunday(date)) {
    return addDays(date, 1); // Sunday -> Monday
  }
  return date;
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
