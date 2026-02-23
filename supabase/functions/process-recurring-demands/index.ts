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

    // Fetch active recurring demands where next_run_date <= today
    const { data: recurringDemands, error: fetchError } = await supabase
      .from("recurring_demands")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_date", today);

    if (fetchError) throw fetchError;

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
            due_date: new Date(rd.next_run_date + "T23:59:59").toISOString(),
          })
          .select("id")
          .single();

        if (createError) {
          console.error(`Error creating demand for recurring ${rd.id}:`, createError);
          errors++;
          continue;
        }

        // Add assignees if configured
        if (rd.assignee_ids && rd.assignee_ids.length > 0 && newDemand) {
          const assigneeInserts = rd.assignee_ids.map((userId: string) => ({
            demand_id: newDemand.id,
            user_id: userId,
          }));

          await supabase.from("demand_assignees").insert(assigneeInserts);
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

function calculateNextRunDate(
  frequency: string,
  currentDate: string,
  weekdays: number[] | null,
  dayOfMonth: number | null
): string {
  const current = new Date(currentDate + "T12:00:00Z");

  if (frequency === "daily") {
    current.setUTCDate(current.getUTCDate() + 1);
    return formatDate(current);
  }

  if (frequency === "weekly") {
    if (!weekdays || weekdays.length === 0) {
      // Default: same day next week
      current.setUTCDate(current.getUTCDate() + 7);
      return formatDate(current);
    }

    // Find next weekday in the list
    const sortedDays = [...weekdays].sort((a, b) => a - b);
    const currentDay = current.getUTCDay();

    // Find next day after current
    let nextDay = sortedDays.find((d) => d > currentDay);
    if (nextDay !== undefined) {
      const diff = nextDay - currentDay;
      current.setUTCDate(current.getUTCDate() + diff);
    } else {
      // Wrap to next week, first day in list
      const diff = 7 - currentDay + sortedDays[0];
      current.setUTCDate(current.getUTCDate() + diff);
    }
    return formatDate(current);
  }

  if (frequency === "monthly") {
    const day = dayOfMonth || current.getUTCDate();
    current.setUTCMonth(current.getUTCMonth() + 1);
    // Clamp to valid day (e.g., 31 in a 30-day month)
    const maxDay = new Date(current.getUTCFullYear(), current.getUTCMonth() + 1, 0).getUTCDate();
    current.setUTCDate(Math.min(day, maxDay));
    return formatDate(current);
  }

  // Fallback: next day
  current.setUTCDate(current.getUTCDate() + 1);
  return formatDate(current);
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
