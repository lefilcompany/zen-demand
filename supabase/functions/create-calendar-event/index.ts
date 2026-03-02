import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toICSDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return (text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function generateICS(params: {
  uid: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  meetLink: string | null;
  attendeeEmails: string[];
}): string {
  const { uid, title, description, startTime, endTime, meetLink, attendeeEmails } = params;

  const descWithMeet = meetLink
    ? `${description}${description ? "\\n\\n" : ""}Link da reunião: ${meetLink}`
    : description;

  const attendeeLines = attendeeEmails
    .map((e) => `ATTENDEE;RSVP=TRUE;CN=${e}:mailto:${e}`)
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SoMA+//Calendar//PT",
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@soma.lefil.com.br`,
    `DTSTART:${toICSDate(startTime)}`,
    `DTEND:${toICSDate(endTime)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(descWithMeet)}`,
    meetLink ? `LOCATION:${escapeICS(meetLink)}` : "",
    "STATUS:CONFIRMED",
    "ORGANIZER;CN=SoMA+:mailto:noreply@pla.soma.lefil.com.br",
    attendeeLines,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function buildInviteHTML(params: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  meetLink: string | null;
  attendeeEmails: string[];
}): string {
  const { title, description, startTime, endTime, meetLink, attendeeEmails } = params;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const dateStr = start.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Sao_Paulo" });
  const startStr = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const endStr = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const participantsList = attendeeEmails.map((e) => `<li>${e}</li>`).join("");

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#7c3aed;padding:24px 28px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">📅 Convite de Reunião</h1>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px;color:#1f2937;">${title}</h2>
      ${description ? `<p style="color:#6b7280;margin:0 0 16px;">${description}</p>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:80px;">📆 Data</td><td style="padding:8px 0;color:#1f2937;">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">🕐 Horário</td><td style="padding:8px 0;color:#1f2937;">${startStr} – ${endStr}</td></tr>
      </table>
      ${meetLink ? `<a href="${meetLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:20px;">Entrar na reunião (Google Meet)</a>` : ""}
      ${attendeeEmails.length > 0 ? `<div style="margin-top:20px;"><p style="color:#6b7280;margin:0 0 8px;font-size:14px;">Participantes:</p><ul style="margin:0;padding-left:20px;color:#1f2937;">${participantsList}</ul></div>` : ""}
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Este convite foi enviado via SoMA+. Abra o arquivo .ics em anexo para adicionar ao seu calendário.</p>
    </div>
  </div>
</body></html>`;
}

// Base64 encode for Deno
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

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
    const { title, description, startTime, endTime, attendeeEmails } = await req.json();

    if (!title || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: "title, startTime and endTime are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google service account credentials
    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKeyPem = Deno.env.get("GOOGLE_PRIVATE_KEY");

    if (!serviceAccountEmail || !privateKeyPem) {
      return new Response(
        JSON.stringify({ error: "Google service account not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPrivateKey = privateKeyPem.replace(/\\n/g, "\n");

    // Sign JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const privateKey = await importPKCS8(cleanPrivateKey, "RS256");

    const googleJwt = await new SignJWT({
      iss: serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .sign(privateKey);

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: googleJwt,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google token error:", tokenData);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Google", details: tokenData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create calendar event with Meet link (no attendees - service account limitation)
    const requestId = crypto.randomUUID();

    let fullDescription = description || "";
    if (attendeeEmails && attendeeEmails.length > 0) {
      fullDescription += (fullDescription ? "\n\n" : "") +
        "Participantes:\n" + attendeeEmails.map((e: string) => `• ${e}`).join("\n");
    }

    const calendarEvent = {
      summary: title,
      description: fullDescription,
      start: { dateTime: startTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime, timeZone: "America/Sao_Paulo" },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 30 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meetLink =
      eventData.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === "video"
      )?.uri || null;

    // Send .ics invite emails to attendees via Resend
    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    if (attendeeEmails && attendeeEmails.length > 0) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      if (RESEND_API_KEY) {
        const icsContent = generateICS({
          uid: eventData.id || requestId,
          title,
          description: description || "",
          startTime,
          endTime,
          meetLink,
          attendeeEmails,
        });

        const emailHTML = buildInviteHTML({
          title,
          description: description || "",
          startTime,
          endTime,
          meetLink,
          attendeeEmails,
        });

        const icsBase64 = toBase64(icsContent);

        const emailPromises = attendeeEmails.map(async (email: string) => {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "SoMA+ <noreply@pla.soma.lefil.com.br>",
                to: [email],
                subject: `Convite: ${title}`,
                html: emailHTML,
                attachments: [
                  {
                    filename: "invite.ics",
                    content: icsBase64,
                    content_type: "text/calendar; method=REQUEST",
                  },
                ],
              }),
            });

            const resData = await res.json();
            if (res.ok) {
              emailsSent.push(email);
            } else {
              console.error(`Failed to send invite to ${email}:`, resData);
              emailsFailed.push(email);
            }
          } catch (err) {
            console.error(`Error sending invite to ${email}:`, err);
            emailsFailed.push(email);
          }
        });

        await Promise.all(emailPromises);
        console.log(`Invites sent: ${emailsSent.length}, failed: ${emailsFailed.length}`);
      } else {
        console.warn("RESEND_API_KEY not configured, skipping invite emails");
      }
    }

    return new Response(
      JSON.stringify({
        eventId: eventData.id,
        eventLink: eventData.htmlLink,
        meetLink,
        emailsSent,
        emailsFailed,
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
