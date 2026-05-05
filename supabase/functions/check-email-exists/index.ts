import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Use admin listUsers with email filter
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    } as any);

    if (error) {
      console.error("listUsers error", error);
      // Fail-open: assume exists so user can attempt login
      return new Response(
        JSON.stringify({ exists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback: do a paginated search since admin filter isn't always supported
    let exists = false;
    let page = 1;
    const perPage = 1000;
    // Limit to first 10 pages (10k users) for safety
    while (page <= 10) {
      const { data: pageData, error: pageErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (pageErr) break;
      if (pageData?.users?.some((u) => u.email?.toLowerCase() === normalized)) {
        exists = true;
        break;
      }
      if (!pageData?.users || pageData.users.length < perPage) break;
      page++;
    }

    return new Response(
      JSON.stringify({ exists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("check-email-exists error", err);
    return new Response(
      JSON.stringify({ exists: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
