// Verify a user's WhatsApp phone:
//  action=send  -> generate 6-digit code, send via Twilio WhatsApp, store hash
//  action=verify-> validate code, set profiles.whatsapp_phone + whatsapp_verified_at
//
// Auth: requires user JWT.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY")!;
// User must set TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886" for Twilio Sandbox)
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") || "whatsapp:+14155238886";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizePhone(raw: string): string {
  const p = raw.trim().replace(/^whatsapp:/i, "");
  return p.startsWith("+") ? p : "+" + p.replace(/\D/g, "");
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: TWILIO_WHATSAPP_FROM,
      Body: body,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twilio ${res.status}: ${txt}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (authErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = claims.claims.sub as string;

  let payload: { action?: string; phone?: string; code?: string };
  try { payload = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const action = payload.action;
  const phone = payload.phone ? normalizePhone(payload.phone) : "";

  if (!phone || !/^\+\d{8,15}$/.test(phone)) {
    return new Response(JSON.stringify({ error: "Telefone inválido. Use formato internacional, ex: +5511999999999" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    if (action === "send") {
      // Phone uniqueness check
      const { data: existing } = await admin.from("profiles").select("id").eq("whatsapp_phone", phone).neq("id", userId).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "Este telefone já está vinculado a outra conta." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await sha256(code);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await admin.from("whatsapp_phone_codes").insert({ user_id: userId, phone, code_hash, expires_at });
      await sendWhatsApp(phone, `Seu código SoMA: ${code}\n(válido por 10 minutos)`);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify") {
      const code = (payload.code || "").trim();
      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: "Código inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const code_hash = await sha256(code);
      const { data: rec } = await admin
        .from("whatsapp_phone_codes")
        .select("id, code_hash, expires_at, consumed_at, attempts")
        .eq("user_id", userId).eq("phone", phone)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!rec) {
        return new Response(JSON.stringify({ error: "Solicite um novo código." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (rec.consumed_at) {
        return new Response(JSON.stringify({ error: "Código já utilizado." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (new Date(rec.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "Código expirado. Solicite um novo." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (rec.attempts >= 5) {
        return new Response(JSON.stringify({ error: "Muitas tentativas. Solicite um novo código." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (rec.code_hash !== code_hash) {
        await admin.from("whatsapp_phone_codes").update({ attempts: rec.attempts + 1 }).eq("id", rec.id);
        return new Response(JSON.stringify({ error: "Código incorreto." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await admin.from("whatsapp_phone_codes").update({ consumed_at: new Date().toISOString() }).eq("id", rec.id);
      await admin.from("profiles").update({ whatsapp_phone: phone, whatsapp_verified_at: new Date().toISOString() }).eq("id", userId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("verify-phone error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
