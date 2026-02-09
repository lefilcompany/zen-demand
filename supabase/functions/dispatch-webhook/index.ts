import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return "sha256=" + Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { event, team_id, data } = await req.json();

    if (!event || !team_id) {
      return new Response(JSON.stringify({ error: "event and team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active webhook subscriptions for this team and event
    const { data: subscriptions, error } = await supabase
      .from("webhook_subscriptions")
      .select("*")
      .eq("team_id", team_id)
      .eq("is_active", true)
      .contains("events", [event]);

    if (error || !subscriptions?.length) {
      return new Response(JSON.stringify({ dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const signature = await signPayload(payload, sub.secret);

        try {
          const response = await fetch(sub.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": event,
            },
            body: payload,
            signal: AbortSignal.timeout(10000),
          });

          const responseBody = await response.text().catch(() => "");

          await supabase.from("webhook_logs").insert({
            subscription_id: sub.id,
            event,
            payload: { event, data },
            response_status: response.status,
            response_body: responseBody.substring(0, 1000),
            success: response.ok,
          });

          await supabase
            .from("webhook_subscriptions")
            .update({ last_triggered_at: new Date().toISOString() })
            .eq("id", sub.id);

          return { id: sub.id, success: response.ok, status: response.status };
        } catch (fetchError) {
          await supabase.from("webhook_logs").insert({
            subscription_id: sub.id,
            event,
            payload: { event, data },
            response_status: 0,
            response_body: String(fetchError),
            success: false,
          });
          return { id: sub.id, success: false, error: String(fetchError) };
        }
      })
    );

    return new Response(
      JSON.stringify({ dispatched: subscriptions.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
