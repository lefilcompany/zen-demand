import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { email, password } = await req.json();

  // Find user by email
  const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return Response.json({ error: listErr.message }, { status: 500 });

  const user = users.users.find((u: any) => u.email === email);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // Update password
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  return Response.json({ success: true, user_id: user.id });
});
