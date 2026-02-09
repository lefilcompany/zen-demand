import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authenticate via X-API-Key header
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keyHash = await hashKey(apiKey);

  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys")
    .select("id, team_id, permissions, is_active, expires_at")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (keyError || !keyRecord) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "API key expired" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

  const teamId = keyRecord.team_id;
  const permissions = keyRecord.permissions as Record<string, boolean>;

  // Parse URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Remove "public-api" from path
  const funcIndex = pathParts.indexOf("public-api");
  const routeParts = pathParts.slice(funcIndex + 1);
  const method = req.method;

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const logRequest = async (path: string, statusCode: number) => {
    await supabase.from("api_logs").insert({
      api_key_id: keyRecord.id,
      method,
      path,
      status_code: statusCode,
    });
  };

  const routePath = routeParts.join("/");

  try {
    // GET /demands
    if (method === "GET" && routePath === "demands") {
      if (!permissions["demands.read"]) {
        await logRequest("/demands", 403);
        return respond({ error: "Permission denied" }, 403);
      }

      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const status = url.searchParams.get("status");
      const boardId = url.searchParams.get("board_id");

      let query = supabase
        .from("demands")
        .select("id, title, description, priority, created_at, updated_at, due_date, delivered_at, board_id, status_id, service_id, archived, board_sequence_number")
        .eq("team_id", teamId)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (boardId) query = query.eq("board_id", boardId);
      if (status) query = query.eq("status_id", status);

      const { data, error } = await query;
      if (error) {
        await logRequest("/demands", 500);
        return respond({ error: error.message }, 500);
      }

      await logRequest("/demands", 200);
      return respond({ data, total: data?.length || 0 });
    }

    // GET /demands/:id
    if (method === "GET" && routeParts[0] === "demands" && routeParts.length === 2) {
      if (!permissions["demands.read"]) {
        await logRequest(`/demands/${routeParts[1]}`, 403);
        return respond({ error: "Permission denied" }, 403);
      }

      const { data, error } = await supabase
        .from("demands")
        .select("*, demand_statuses(name, color), services(name)")
        .eq("id", routeParts[1])
        .eq("team_id", teamId)
        .single();

      if (error) {
        await logRequest(`/demands/${routeParts[1]}`, 404);
        return respond({ error: "Demand not found" }, 404);
      }

      await logRequest(`/demands/${routeParts[1]}`, 200);
      return respond({ data });
    }

    // POST /demands
    if (method === "POST" && routePath === "demands") {
      if (!permissions["demands.write"]) {
        await logRequest("/demands", 403);
        return respond({ error: "Permission denied" }, 403);
      }

      const body = await req.json();
      const { title, description, board_id, priority, service_id, status_id } = body;

      if (!title || !board_id || !status_id) {
        await logRequest("/demands", 400);
        return respond({ error: "title, board_id, and status_id are required" }, 400);
      }

      // Verify board belongs to team
      const { data: board } = await supabase
        .from("boards")
        .select("id")
        .eq("id", board_id)
        .eq("team_id", teamId)
        .single();

      if (!board) {
        await logRequest("/demands", 400);
        return respond({ error: "Board not found in this team" }, 400);
      }

      // Use the API key creator as created_by
      const { data: keyCreator } = await supabase
        .from("api_keys")
        .select("created_by")
        .eq("id", keyRecord.id)
        .single();

      const { data, error } = await supabase
        .from("demands")
        .insert({
          title,
          description: description || null,
          board_id,
          team_id: teamId,
          priority: priority || "medium",
          service_id: service_id || null,
          status_id,
          created_by: keyCreator?.created_by,
        })
        .select()
        .single();

      if (error) {
        await logRequest("/demands", 500);
        return respond({ error: error.message }, 500);
      }

      await logRequest("/demands", 201);
      return respond({ data }, 201);
    }

    // PATCH /demands/:id/status
    if (method === "PATCH" && routeParts[0] === "demands" && routeParts[2] === "status") {
      if (!permissions["demands.write"]) {
        await logRequest(`/demands/${routeParts[1]}/status`, 403);
        return respond({ error: "Permission denied" }, 403);
      }

      const body = await req.json();
      const { status_id } = body;

      if (!status_id) {
        await logRequest(`/demands/${routeParts[1]}/status`, 400);
        return respond({ error: "status_id is required" }, 400);
      }

      const { data, error } = await supabase
        .from("demands")
        .update({ status_id })
        .eq("id", routeParts[1])
        .eq("team_id", teamId)
        .select()
        .single();

      if (error) {
        await logRequest(`/demands/${routeParts[1]}/status`, 500);
        return respond({ error: error.message }, 500);
      }

      await logRequest(`/demands/${routeParts[1]}/status`, 200);
      return respond({ data });
    }

    // GET /boards
    if (method === "GET" && routePath === "boards") {
      if (!permissions["boards.read"]) {
        await logRequest("/boards", 403);
        return respond({ error: "Permission denied" }, 403);
      }

      const { data, error } = await supabase
        .from("boards")
        .select("id, name, description, created_at")
        .eq("team_id", teamId);

      if (error) {
        await logRequest("/boards", 500);
        return respond({ error: error.message }, 500);
      }

      await logRequest("/boards", 200);
      return respond({ data });
    }

    // GET /statuses
    if (method === "GET" && routePath === "statuses") {
      if (!permissions["statuses.read"]) {
        await logRequest("/statuses", 403);
        return respond({ error: "Permission denied" }, 403);
      }

      const { data, error } = await supabase
        .from("demand_statuses")
        .select("id, name, color")
        .eq("is_system", true);

      if (error) {
        await logRequest("/statuses", 500);
        return respond({ error: error.message }, 500);
      }

      await logRequest("/statuses", 200);
      return respond({ data });
    }

    // POST /webhooks/test
    if (method === "POST" && routePath === "webhooks/test") {
      await logRequest("/webhooks/test", 200);
      return respond({ success: true, message: "API connection working", team_id: teamId });
    }

    await logRequest(routePath, 404);
    return respond({ error: "Not found" }, 404);
  } catch (err) {
    await logRequest(routePath || "/", 500);
    return respond({ error: "Internal server error" }, 500);
  }
});
