import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import React from "https://esm.sh/react@18.3.1";
import { render } from "https://esm.sh/@react-email/render@0.0.12";
import { NotificationEmail } from "./_templates/notification.tsx";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string; // Can be email or user_id (UUID)
  subject: string;
  html?: string;
  from?: string;
  // For template-based emails
  template?: 'notification';
  templateData?: {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    userName?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  };
}

// Check if string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from, template, templateData }: EmailRequest = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let recipientEmail = to;

    // If 'to' is a UUID, lookup the user's email from Supabase Auth
    if (isUUID(to)) {
      console.log(`Looking up email for user_id: ${to}`);
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing Supabase credentials for user lookup");
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(to);
      
      if (userError || !userData?.user?.email) {
        console.error("Error fetching user email:", userError);
        return new Response(
          JSON.stringify({ error: "Could not find user email", details: userError?.message }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      recipientEmail = userData.user.email;
      console.log(`Found email for user: ${recipientEmail}`);
    }

    let emailHtml = html;

    // If using template, render React Email
    if (template === 'notification' && templateData) {
      console.log('Rendering notification template for:', templateData.title);
      emailHtml = render(
        React.createElement(NotificationEmail, {
          title: templateData.title,
          message: templateData.message,
          actionUrl: templateData.actionUrl,
          actionText: templateData.actionText,
          userName: templateData.userName,
          type: templateData.type,
        })
      );
    }

    if (!emailHtml) {
      return new Response(
        JSON.stringify({ error: "Missing email content: provide html or template with templateData" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending email to ${recipientEmail} with subject: ${subject}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "SoMA+ <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);