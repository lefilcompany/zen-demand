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

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { action, code, redirectUri, userId, refreshToken } = await req.json();

    if (action === "authorize") {
      // Build Google OAuth URL
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.events",
        access_type: "offline",
        prompt: "consent",
        state: userId,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      if (!code || !redirectUri || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing code, redirectUri, or userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Google token exchange error:", tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.error_description || "Failed to exchange code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { access_token, refresh_token, expires_in } = tokenData;
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Store tokens in DB using service role
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error: upsertError } = await supabase
        .from("google_calendar_tokens")
        .upsert(
          {
            user_id: userId,
            access_token,
            refresh_token: refresh_token || "",
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Error storing tokens:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to store tokens" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh") {
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: "Missing refreshToken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Google token refresh error:", tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.error_description || "Failed to refresh token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { access_token, expires_in } = tokenData;
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Update token in DB
      if (userId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("google_calendar_tokens")
          .update({
            access_token,
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }

      return new Response(
        JSON.stringify({ access_token, expires_at: tokenExpiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
