import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, startTime, endTime, attendeeEmails, googleAccessToken } = await req.json();

    if (!googleAccessToken) {
      return new Response(
        JSON.stringify({ error: "Google access token is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: "title, startTime and endTime are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = {
      summary: title,
      description: description || "",
      start: {
        dateTime: startTime,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endTime,
        timeZone: "America/Sao_Paulo",
      },
      attendees: (attendeeEmails || []).map((email: string) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Calendar API error:", errorData);
      return new Response(
        JSON.stringify({ error: errorData.error?.message || "Failed to create calendar event" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdEvent = await response.json();
    const meetLink = createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri || null;

    return new Response(
      JSON.stringify({
        eventId: createdEvent.id,
        meetLink,
        htmlLink: createdEvent.htmlLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
