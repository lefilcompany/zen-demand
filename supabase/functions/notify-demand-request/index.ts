import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import React from "https://esm.sh/react@18.3.1";
import { render } from "https://esm.sh/@react-email/render@0.0.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
} from "https://esm.sh/@react-email/components@0.0.22";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  requestId: string;
  teamId: string;
  boardId: string;
  title: string;
  description?: string;
  priority: string;
  requesterName: string;
}

// Email template component
const DemandRequestEmail = ({
  title,
  description,
  priority,
  requesterName,
  boardName,
  actionUrl,
}: {
  title: string;
  description?: string;
  priority: string;
  requesterName: string;
  boardName: string;
  actionUrl: string;
}) => {
  const priorityColors: Record<string, string> = {
    baixa: "#22c55e",
    média: "#eab308",
    alta: "#ef4444",
  };

  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(
      Body,
      {
        style: {
          backgroundColor: "#f6f9fc",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
      React.createElement(
        Container,
        {
          style: {
            backgroundColor: "#ffffff",
            margin: "40px auto",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "600px",
          },
        },
        React.createElement(
          Heading,
          {
            style: {
              color: "#1f2937",
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "16px",
            },
          },
          "Nova Solicitação de Demanda"
        ),
        React.createElement(
          Text,
          { style: { color: "#6b7280", fontSize: "16px", marginBottom: "24px" } },
          `${requesterName} enviou uma nova solicitação de demanda no quadro "${boardName}".`
        ),
        React.createElement(Hr, { style: { borderColor: "#e5e7eb", margin: "24px 0" } }),
        React.createElement(
          Section,
          { style: { marginBottom: "24px" } },
          React.createElement(
            Text,
            {
              style: {
                color: "#374151",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              },
            },
            "Título:"
          ),
          React.createElement(
            Text,
            { style: { color: "#1f2937", fontSize: "18px", fontWeight: "bold", margin: 0 } },
            title
          )
        ),
        description &&
          React.createElement(
            Section,
            { style: { marginBottom: "24px" } },
            React.createElement(
              Text,
              {
                style: {
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "8px",
                },
              },
              "Descrição:"
            ),
            React.createElement(
              Text,
              { style: { color: "#6b7280", fontSize: "14px", margin: 0 } },
              description
            )
          ),
        React.createElement(
          Section,
          { style: { marginBottom: "24px" } },
          React.createElement(
            Text,
            {
              style: {
                color: "#374151",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              },
            },
            "Prioridade:"
          ),
          React.createElement(
            Text,
            {
              style: {
                color: priorityColors[priority] || "#6b7280",
                fontSize: "14px",
                fontWeight: "600",
                margin: 0,
                textTransform: "capitalize",
              },
            },
            priority
          )
        ),
        React.createElement(Hr, { style: { borderColor: "#e5e7eb", margin: "24px 0" } }),
        React.createElement(
          Button,
          {
            href: actionUrl,
            style: {
              backgroundColor: "#7c3aed",
              borderRadius: "6px",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              textDecoration: "none",
              textAlign: "center" as const,
              display: "block",
              padding: "12px 24px",
            },
          },
          "Ver Solicitação"
        ),
        React.createElement(
          Text,
          {
            style: {
              color: "#9ca3af",
              fontSize: "12px",
              marginTop: "24px",
              textAlign: "center" as const,
            },
          },
          "Este email foi enviado automaticamente pelo SoMA+."
        )
      )
    )
  );
};

// Verify JWT token and get user
async function verifyAuth(
  req: Request
): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { userId: null, error: "Server configuration error" };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Auth verification failed:", error);
      return { userId: null, error: "Invalid or expired token" };
    }

    return { userId: user.id, error: null };
  } catch (err) {
    console.error("Auth verification error:", err);
    return { userId: null, error: "Authentication failed" };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth(req);

    if (authError || !userId) {
      console.warn("Unauthorized request:", authError);
      return new Response(JSON.stringify({ error: authError || "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Notify demand request from user: ${userId}`);

    const {
      requestId,
      teamId,
      boardId,
      title,
      description,
      priority,
      requesterName,
    }: NotifyRequest = await req.json();

    if (!requestId || !teamId || !boardId || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      console.error("Missing required environment variables");
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

    // Get board name
    const { data: board } = await supabaseAdmin
      .from("boards")
      .select("name")
      .eq("id", boardId)
      .single();

    const boardName = board?.name || "Quadro";

    // Get all admins and moderators from the team
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .in("role", ["admin", "moderator"]);

    if (adminsError) {
      console.error("Error fetching admins:", adminsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch team admins" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!admins || admins.length === 0) {
      console.log("No admins found for team:", teamId);
      return new Response(JSON.stringify({ success: true, emailsSent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${admins.length} admins/moderators to notify`);

    // Get emails for all admins
    const adminEmails: string[] = [];
    for (const admin of admins) {
      // Skip the requester (don't notify yourself)
      if (admin.user_id === userId) continue;

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
        admin.user_id
      );
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admin emails found to notify");
      return new Response(JSON.stringify({ success: true, emailsSent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending emails to ${adminEmails.length} admins:`, adminEmails);

    // Generate the action URL
    const appUrl = "https://pla.soma.lefil.com.br"; // Production URL
    const actionUrl = `${appUrl}/demand-requests`;

    // Render email template
    const emailHtml = render(
      React.createElement(DemandRequestEmail, {
        title,
        description,
        priority: priority || "média",
        requesterName,
        boardName,
        actionUrl,
      })
    );

    // Send email to all admins
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SoMA+ <noreply@pla.soma.lefil.com.br>",
        to: adminEmails,
        subject: `Nova Solicitação de Demanda: ${title.substring(0, 50)}${title.length > 50 ? "..." : ""}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(JSON.stringify({ error: "Failed to send emails" }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Emails sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, emailsSent: adminEmails.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-demand-request function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
