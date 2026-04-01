import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    console.log("Processing recurring demands for date:", today);

    // Fetch active recurring demands where next_run_date <= today
    const { data: recurringDemands, error: fetchError } = await supabase
      .from("recurring_demands")
      .select("*, services:service_id(estimated_hours)")
      .eq("is_active", true)
      .lte("next_run_date", today);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }
    
    console.log("Found recurring demands:", recurringDemands?.length || 0);

    if (!recurringDemands || recurringDemands.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recurring demands to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const rd of recurringDemands) {
      try {
        // Check if end_date passed
        if (rd.end_date && rd.end_date < today) {
          await supabase
            .from("recurring_demands")
            .update({ is_active: false })
            .eq("id", rd.id);
          continue;
        }

        // Calculate due_date: if service has estimated_hours, add business days
        const estimatedHours = rd.services?.estimated_hours;
        const dueDate = estimatedHours
          ? calculateBusinessDueDate(rd.next_run_date, estimatedHours)
          : adjustDueDateToBusinessDay(rd.next_run_date);

        // Create the demand
        const { data: newDemand, error: createError } = await supabase
          .from("demands")
          .insert({
            title: rd.title,
            description: rd.description,
            priority: rd.priority,
            status_id: rd.status_id,
            service_id: rd.service_id,
            board_id: rd.board_id,
            team_id: rd.team_id,
            created_by: rd.created_by,
            due_date: dueDate,
          })
          .select("id")
          .single();

        if (createError) {
          console.error(`Error creating demand for recurring ${rd.id}:`, createError);
          errors++;
          continue;
        }

        // Add assignees if configured (triggers notify_assignee_added for notifications)
        if (rd.assignee_ids && rd.assignee_ids.length > 0 && newDemand) {
          const assigneeInserts = rd.assignee_ids.map((userId: string) => ({
            demand_id: newDemand.id,
            user_id: userId,
          }));

          const { error: assignError } = await supabase.from("demand_assignees").insert(assigneeInserts);
          if (assignError) {
            console.error(`Error adding assignees for recurring demand ${rd.id}:`, assignError);
          }
        }

        // Calculate next_run_date
        const nextDate = calculateNextRunDate(
          rd.frequency,
          rd.next_run_date,
          rd.weekdays,
          rd.day_of_month
        );

        // Check if next date exceeds end_date
        const isStillActive = !rd.end_date || nextDate <= rd.end_date;

        await supabase
          .from("recurring_demands")
          .update({
            last_generated_at: new Date().toISOString(),
            next_run_date: nextDate,
            is_active: isStillActive,
          })
          .eq("id", rd.id);

        processed++;
      } catch (err) {
        console.error(`Error processing recurring demand ${rd.id}:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Processing complete", processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-recurring-demands:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateBusinessDueDate(startDateStr: string, estimatedHours: number): string {
  const hoursPerDay = 8;
  let businessDays = Math.ceil(estimatedHours / hoursPerDay);
  if (businessDays < 1) businessDays = 1;

  const d = new Date(startDateStr + "T23:59:59Z");
  let added = 0;
  while (added < businessDays) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString();
}

function adjustDueDateToBusinessDay(dateStr: string): string {
  const d = new Date(dateStr + "T23:59:59Z");
  const day = d.getUTCDay();
  if (day === 0) d.setUTCDate(d.getUTCDate() + 1);
  if (day === 6) d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString();
}

function adjustToBusinessDay(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  if (day === 0) d.setUTCDate(d.getUTCDate() + 1); // Sunday -> Monday
  if (day === 6) d.setUTCDate(d.getUTCDate() + 2); // Saturday -> Monday
  return d;
}

function calculateNextRunDate(
  frequency: string,
  currentDate: string,
  weekdays: number[] | null,
  dayOfMonth: number | null
): string {
  const current = new Date(currentDate + "T12:00:00Z");

  // Test frequencies: next_run_date = today (cron runs every minute, so it'll pick it up again)
  if (frequency === "test_1min" || frequency === "test_5min") {
    return formatDate(current); // same day = cron picks it up next minute
  }

  if (frequency === "daily") {
    current.setUTCDate(current.getUTCDate() + 1);
    return formatDate(adjustToBusinessDay(current));
  }

  if (frequency === "weekly") {
    if (!weekdays || weekdays.length === 0) {
      current.setUTCDate(current.getUTCDate() + 7);
      return formatDate(adjustToBusinessDay(current));
    }

    const sortedDays = [...weekdays].sort((a, b) => a - b);
    const currentDay = current.getUTCDay();

    // Find next day after current in the same week
    const nextDay = sortedDays.find((d) => d > currentDay);
    if (nextDay !== undefined) {
      current.setUTCDate(current.getUTCDate() + (nextDay - currentDay));
    } else {
      // Wrap to next week, first day in list
      const diff = 7 - currentDay + sortedDays[0];
      current.setUTCDate(current.getUTCDate() + diff);
    }
    return formatDate(adjustToBusinessDay(current));
  }

  if (frequency === "biweekly") {
    if (!weekdays || weekdays.length === 0) {
      // No specific weekdays: simply add 14 days
      current.setUTCDate(current.getUTCDate() + 14);
      return formatDate(adjustToBusinessDay(current));
    }

    // Biweekly with weekdays: jump 2 weeks and find first matching weekday
    const sortedDays = [...weekdays].sort((a, b) => a - b);
    const currentDay = current.getUTCDay();
    
    // Jump to the same day 2 weeks from now, then find the first matching weekday
    const twoWeeksLater = new Date(current);
    twoWeeksLater.setUTCDate(twoWeeksLater.getUTCDate() + 14 - currentDay); // Go to start of that week (Sunday)
    
    // Find first matching weekday in that week
    for (const wd of sortedDays) {
      const candidate = new Date(twoWeeksLater);
      candidate.setUTCDate(candidate.getUTCDate() + wd);
      if (candidate > current) {
        return formatDate(adjustToBusinessDay(candidate));
      }
    }
    
    // Fallback: just add 14 days
    current.setUTCDate(current.getUTCDate() + 14);
    return formatDate(adjustToBusinessDay(current));
  }

  if (frequency === "monthly") {
    const day = dayOfMonth || current.getUTCDate();
    current.setUTCMonth(current.getUTCMonth() + 1);
    const maxDay = new Date(current.getUTCFullYear(), current.getUTCMonth() + 1, 0).getUTCDate();
    current.setUTCDate(Math.min(day, maxDay));
    return formatDate(adjustToBusinessDay(current));
  }

  // Fallback: next business day
  current.setUTCDate(current.getUTCDate() + 1);
  return formatDate(adjustToBusinessDay(current));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
