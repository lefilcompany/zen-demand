import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface RecurringDemandInput {
  team_id: string;
  board_id: string;
  title: string;
  description?: string | null;
  priority?: string;
  status_id: string;
  service_id?: string | null;
  assignee_ids?: string[];
  frequency: "daily" | "weekly" | "monthly";
  weekdays?: number[];
  day_of_month?: number | null;
  start_date: string;
  end_date?: string | null;
}

export function useRecurringDemands(boardId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recurring-demands", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_demands" as any)
        .select("*")
        .eq("board_id", boardId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!boardId,
  });
}

export function useCreateRecurringDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecurringDemandInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      // Calculate next_run_date based on frequency and start_date
      const nextRunDate = calculateInitialNextRunDate(
        input.frequency,
        input.start_date,
        input.weekdays,
        input.day_of_month
      );

      const { data, error } = await supabase
        .from("recurring_demands" as any)
        .insert({
          team_id: input.team_id,
          board_id: input.board_id,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          priority: input.priority || "média",
          status_id: input.status_id,
          service_id: input.service_id || null,
          assignee_ids: input.assignee_ids || [],
          frequency: input.frequency,
          weekdays: input.weekdays || [],
          day_of_month: input.day_of_month || null,
          start_date: input.start_date,
          end_date: input.end_date || null,
          next_run_date: nextRunDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-demands"] });
    },
  });
}

export function useDeleteRecurringDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_demands" as any)
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-demands"] });
    },
  });
}

function calculateInitialNextRunDate(
  frequency: string,
  startDate: string,
  weekdays?: number[],
  dayOfMonth?: number | null
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00");

  // If start_date is in the future, use it directly (or find first matching day)
  if (start >= today) {
    if (frequency === "weekly" && weekdays && weekdays.length > 0) {
      const d = new Date(start);
      for (let i = 0; i < 7; i++) {
        if (weekdays.includes(d.getDay())) {
          return formatDate(d);
        }
        d.setDate(d.getDate() + 1);
      }
    }
    if (frequency === "monthly" && dayOfMonth && dayOfMonth < 0) {
      return resolveSpecialMonthDay(start.getFullYear(), start.getMonth(), dayOfMonth);
    }
    return startDate;
  }

  // If start_date is today or past
  if (frequency === "daily") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }

  if (frequency === "weekly" && weekdays && weekdays.length > 0) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    for (let i = 0; i < 7; i++) {
      if (weekdays.includes(d.getDay())) {
        return formatDate(d);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  if (frequency === "monthly") {
    const day = dayOfMonth || start.getDate();
    if (day < 0) {
      // Special values: try this month first, if past use next month
      const thisMonth = resolveSpecialMonthDay(today.getFullYear(), today.getMonth(), day);
      if (new Date(thisMonth + "T00:00:00") > today) return thisMonth;
      return resolveSpecialMonthDay(
        today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(),
        (today.getMonth() + 1) % 12,
        day
      );
    }
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(day, 28));
    return formatDate(nextMonth);
  }

  // Fallback
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

function resolveSpecialMonthDay(year: number, month: number, specialDay: number): string {
  if (specialDay === -1) {
    // Last day of month
    const d = new Date(year, month + 1, 0);
    return formatDate(d);
  }
  if (specialDay === -2) {
    // First business day
    const d = new Date(year, month, 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return formatDate(d);
  }
  if (specialDay === -3) {
    // Last business day
    const d = new Date(year, month + 1, 0);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() - 1);
    }
    return formatDate(d);
  }
  return formatDate(new Date(year, month, 1));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
