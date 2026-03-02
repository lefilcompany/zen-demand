import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { title, description, startTime, endTime, attendeeEmails, googleAccessToken } = await req.json();

    if (!title || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: "title, startTime and endTime are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!googleAccessToken) {
      return new Response(
        JSON.stringify({ error: "googleAccessToken is required. Connect your Google Calendar in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build calendar event with native attendees
    const calendarEvent: Record<string, unknown> = {
      summary: title,
      description: description || "",
      start: { dateTime: startTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime, timeZone: "America/Sao_Paulo" },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 10 }],
      },
    };

    // Add native attendees — Google sends invites automatically
    if (attendeeEmails && attendeeEmails.length > 0) {
      calendarEvent.attendees = attendeeEmails.map((email: string) => ({ email }));
    }

    // Create event using user's own Google token
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    const eventData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      console.error("Google Calendar error:", eventData);
      return new Response(
        JSON.stringify({ error: "Failed to create calendar event", details: eventData }),
        { status: calendarResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meetLink =
      eventData.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === "video"
      )?.uri || null;

    return new Response(
      JSON.stringify({
        eventId: eventData.id,
        eventLink: eventData.htmlLink,
        meetLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
