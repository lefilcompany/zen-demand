import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting deadline check...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`Checking deadlines between ${now.toISOString()} and ${tomorrow.toISOString()}`);

    // Find demands with deadlines approaching (within 24 hours)
    // that are not completed (status != 'Entregue') and not archived
    const { data: demands, error: demandsError } = await supabase
      .from("demands")
      .select(`
        id,
        title,
        due_date,
        created_by,
        assigned_to,
        team_id,
        demand_statuses!inner(name)
      `)
      .gte("due_date", now.toISOString())
      .lte("due_date", tomorrow.toISOString())
      .eq("archived", false)
      .neq("demand_statuses.name", "Entregue");

    if (demandsError) {
      console.error("Error fetching demands:", demandsError);
      throw demandsError;
    }

    console.log(`Found ${demands?.length || 0} demands with approaching deadlines`);

    if (!demands || demands.length === 0) {
      return new Response(
        JSON.stringify({ message: "No approaching deadlines found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing notifications to avoid duplicates (sent in last 12 hours)
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    
    const notificationsToCreate: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      link: string;
    }> = [];

    for (const demand of demands) {
      const dueDate = new Date(demand.due_date);
      const hoursUntilDeadline = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      // Get users to notify (creator and assigned user)
      const usersToNotify = new Set<string>();
      if (demand.created_by) usersToNotify.add(demand.created_by);
      if (demand.assigned_to) usersToNotify.add(demand.assigned_to);

      for (const userId of usersToNotify) {
        // Check if we already sent a deadline notification for this demand recently
        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("link", `/demands/${demand.id}`)
          .like("title", "%Prazo%")
          .gte("created_at", twelveHoursAgo.toISOString())
          .maybeSingle();

        if (!existingNotification) {
          notificationsToCreate.push({
            user_id: userId,
            title: hoursUntilDeadline <= 2 ? "⚠️ Prazo urgente!" : "Prazo se aproximando",
            message: `A demanda "${demand.title}" vence em ${hoursUntilDeadline} hora${hoursUntilDeadline !== 1 ? "s" : ""}`,
            type: hoursUntilDeadline <= 2 ? "warning" : "info",
            link: `/demands/${demand.id}`,
          });
        }
      }
    }

    console.log(`Creating ${notificationsToCreate.length} notifications`);

    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationsToCreate);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }
    }

    console.log("Deadline check completed successfully");

    return new Response(
      JSON.stringify({ 
        message: "Deadline check completed", 
        demandsChecked: demands.length,
        notificationsSent: notificationsToCreate.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-deadlines function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
