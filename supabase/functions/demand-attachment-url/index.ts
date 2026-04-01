import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const createResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createResponse(401, {
        code: "UNAUTHORIZED",
        error: "Missing authorization header",
      });
    }

    const payload = await req.json().catch(() => null);
    const filePath = typeof payload?.filePath === "string" ? payload.filePath.trim() : "";

    if (!filePath) {
      return createResponse(400, {
        code: "BAD_REQUEST",
        error: "Missing filePath",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return createResponse(401, {
        code: "UNAUTHORIZED",
        error: "Invalid user session",
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: attachment, error: attachmentError } = await adminClient
      .from("demand_attachments")
      .select("id, file_path, demand_id, demands!inner(board_id)")
      .eq("file_path", filePath)
      .maybeSingle();

    if (attachmentError) {
      console.error("Error loading attachment metadata:", attachmentError);
      return createResponse(500, {
        code: "ATTACHMENT_LOOKUP_ERROR",
        error: "Failed to validate attachment",
      });
    }

    if (!attachment) {
      return createResponse(404, {
        code: "ATTACHMENT_NOT_FOUND",
        error: "Attachment not found",
      });
    }

    const boardId = (attachment as { demands: { board_id: string } }).demands.board_id;

    const { data: membership, error: membershipError } = await adminClient
      .from("board_members")
      .select("id")
      .eq("board_id", boardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Error validating board membership:", membershipError);
      return createResponse(500, {
        code: "ACCESS_VALIDATION_ERROR",
        error: "Failed to validate access",
      });
    }

    if (!membership) {
      return createResponse(403, {
        code: "FORBIDDEN",
        error: "You do not have access to this attachment",
      });
    }

    const { data: signedData, error: signError } = await adminClient.storage
      .from("demand-attachments")
      .createSignedUrl(filePath, 3600);

    if (signError || !signedData?.signedUrl) {
      console.error("Error creating signed URL:", signError);
      return createResponse(404, {
        code: "SIGNED_URL_ERROR",
        error: "Failed to generate signed URL",
      });
    }

    return createResponse(200, { signedUrl: signedData.signedUrl });
  } catch (error) {
    console.error("Unexpected demand-attachment-url error:", error);
    return createResponse(500, {
      code: "LOAD_ERROR",
      error: "Internal server error",
    });
  }
});
