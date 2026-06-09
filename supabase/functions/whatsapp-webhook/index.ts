// Twilio WhatsApp inbound webhook.
// Twilio posts application/x-www-form-urlencoded with fields like:
//   From=whatsapp:+5511999999999, To=whatsapp:+14155238886, Body=...
//
// Security: requires ?secret=<WHATSAPP_WEBHOOK_SECRET> in URL.
//
// Behavior:
// - Detect "@soma" mention (case-insensitive) — otherwise ignore (return TwiML empty).
// - Resolve sender phone -> profiles.whatsapp_phone (must be verified).
// - Extract #keyword to choose board, fallback to profile.default_whatsapp_board_id.
// - Call Lovable AI to extract title/description/due_date.
// - Registered + board member -> create demand directly.
// - Otherwise -> create demand_request (uses board admin as created_by, prepended note).
// - Reply via TwiML with a short confirmation.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WHATSAPP_WEBHOOK_SECRET")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function twiml(text?: string): Response {
  const xml = text
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(text)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function normalizePhone(raw: string): string {
  // "whatsapp:+5511999..." -> "+5511999..."
  const p = raw.replace(/^whatsapp:/i, "").trim();
  return p.startsWith("+") ? p : "+" + p.replace(/\D/g, "");
}

async function extractWithAI(message: string): Promise<{
  title: string;
  description: string;
  due_date: string | null;
  priority: "low" | "medium" | "high" | null;
}> {
  const prompt = `Extraia desta mensagem de WhatsApp os campos para criar uma demanda de trabalho.
Mensagem: """${message}"""
Responda APENAS com um JSON válido no formato:
{"title":"título curto (max 100 chars)","description":"descrição completa","due_date":"YYYY-MM-DD ou null","priority":"low|medium|high ou null"}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você extrai metadados de demandas a partir de mensagens. Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    return {
      title: String(parsed.title || message.slice(0, 80)).slice(0, 200),
      description: String(parsed.description || message),
      due_date: parsed.due_date || null,
      priority: parsed.priority || null,
    };
  } catch (_e) {
    // Fallback: first line = title, rest = description
    const firstLine = message.split("\n")[0].slice(0, 100);
    return { title: firstLine || "Demanda via WhatsApp", description: message, due_date: null, priority: null };
  }
}

Deno.serve(async (req) => {
  // 1) Validate secret
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  // 2) Parse Twilio form payload
  const form = await req.formData();
  const fromRaw = String(form.get("From") || "");
  const toRaw = String(form.get("To") || "");
  const body = String(form.get("Body") || "").trim();
  const fromPhone = normalizePhone(fromRaw);

  if (!body) return twiml();

  // 3) Detect @soma mention
  if (!/(^|\s)@soma\b/i.test(body)) {
    return twiml(); // ignore silently
  }

  // 4) Strip @soma and extract #keyword
  let cleanMessage = body.replace(/@soma/gi, "").trim();
  const kwMatch = cleanMessage.match(/#([\p{L}\p{N}_-]+)/u);
  const keyword = kwMatch ? kwMatch[1].toLowerCase() : null;
  if (kwMatch) cleanMessage = cleanMessage.replace(kwMatch[0], "").trim();

  // 5) Resolve sender profile
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, default_whatsapp_board_id, whatsapp_verified_at")
    .eq("whatsapp_phone", fromPhone)
    .maybeSingle();

  const isVerifiedUser = !!(profile && profile.whatsapp_verified_at);

  // 6) Resolve board
  let boardId: string | null = null;
  if (keyword) {
    const { data: kw } = await admin
      .from("board_whatsapp_keywords")
      .select("board_id, boards!inner(whatsapp_enabled)")
      .ilike("keyword", keyword)
      .maybeSingle();
    if (kw && (kw as any).boards?.whatsapp_enabled) boardId = kw.board_id;
  }
  if (!boardId && isVerifiedUser && profile?.default_whatsapp_board_id) {
    boardId = profile.default_whatsapp_board_id;
  }

  if (!boardId) {
    await admin.from("whatsapp_inbound_logs").insert({
      from_phone: fromPhone,
      to_phone: normalizePhone(toRaw),
      raw_message: body,
      matched_user_id: profile?.id ?? null,
      status: "no_board",
      error: "Nenhum quadro identificado",
    });
    return twiml(
      "⚠️ SoMA: não consegui identificar o quadro. Use #palavra-chave (ex: '@soma #marketing fazer banner') ou configure um quadro padrão no seu perfil."
    );
  }

  // 7) Validate board enabled + load board info
  const { data: board } = await admin
    .from("boards")
    .select("id, name, team_id, whatsapp_enabled")
    .eq("id", boardId)
    .maybeSingle();

  if (!board || !board.whatsapp_enabled) {
    await admin.from("whatsapp_inbound_logs").insert({
      from_phone: fromPhone, to_phone: normalizePhone(toRaw), raw_message: body,
      matched_user_id: profile?.id ?? null, matched_board_id: boardId,
      status: "board_disabled", error: "Quadro não habilitado para WhatsApp",
    });
    return twiml("⚠️ SoMA: este quadro não está habilitado para receber demandas via WhatsApp.");
  }

  // 8) Rate limit: max 10/hora por telefone
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("whatsapp_inbound_logs")
    .select("id", { count: "exact", head: true })
    .eq("from_phone", fromPhone)
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= 10) {
    return twiml("⚠️ SoMA: limite de 10 demandas/hora atingido. Tente novamente mais tarde.");
  }

  // 9) AI extraction
  const ai = await extractWithAI(cleanMessage);

  // 10) Check if user is a board member (non-requester) -> direct demand
  let directDemand = false;
  if (isVerifiedUser) {
    const { data: bm } = await admin
      .from("board_members")
      .select("role")
      .eq("board_id", board.id)
      .eq("user_id", profile!.id)
      .maybeSingle();
    if (bm && bm.role !== "requester") directDemand = true;
  }

  try {
    if (directDemand) {
      // Get backlog status (first status by sort_order)
      const { data: statuses } = await admin
        .from("board_statuses")
        .select("id, sort_order")
        .eq("board_id", board.id)
        .order("sort_order", { ascending: true })
        .limit(1);
      const statusId = statuses?.[0]?.id;
      if (!statusId) throw new Error("Sem status no quadro");

      const { data: demand, error: dErr } = await admin
        .from("demands")
        .insert({
          title: ai.title,
          description: `${ai.description}\n\n_— criada via WhatsApp_`,
          team_id: board.team_id,
          board_id: board.id,
          status_id: statusId,
          priority: ai.priority,
          due_date: ai.due_date ? `${ai.due_date}T23:59:59Z` : null,
          created_by: profile!.id,
        })
        .select("id, board_sequence_number")
        .single();
      if (dErr) throw dErr;

      // Assign creator as primary responsible
      await admin.from("demand_assignees").insert({
        demand_id: demand.id,
        user_id: profile!.id,
        is_primary: true,
      });

      await admin.from("whatsapp_inbound_logs").insert({
        from_phone: fromPhone, to_phone: normalizePhone(toRaw), raw_message: body,
        matched_user_id: profile!.id, matched_board_id: board.id,
        created_demand_id: demand.id, ai_extraction: ai as any, status: "demand_created",
      });

      return twiml(
        `✅ SoMA: demanda #${demand.board_sequence_number ?? ""} criada no quadro "${board.name}".\n📌 ${ai.title}`
      );
    } else {
      // Create demand_request — need a created_by. Use board admin.
      const { data: adminMember } = await admin
        .from("board_members")
        .select("user_id")
        .eq("board_id", board.id)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (!adminMember) throw new Error("Quadro sem admin");

      const senderInfo = profile?.full_name
        ? `${profile.full_name} (${fromPhone})`
        : fromPhone;
      const { data: request, error: rErr } = await admin
        .from("demand_requests")
        .insert({
          team_id: board.team_id,
          board_id: board.id,
          created_by: adminMember.user_id,
          title: ai.title,
          description: `[via WhatsApp de ${senderInfo}]\n\n${ai.description}`,
          priority: ai.priority,
          status: "pending",
        })
        .select("id")
        .single();
      if (rErr) throw rErr;

      await admin.from("whatsapp_inbound_logs").insert({
        from_phone: fromPhone, to_phone: normalizePhone(toRaw), raw_message: body,
        matched_user_id: profile?.id ?? null, matched_board_id: board.id,
        created_request_id: request.id, ai_extraction: ai as any, status: "request_created",
      });

      return twiml(
        `📥 SoMA: solicitação registrada no quadro "${board.name}". Aguardando aprovação interna.\n📌 ${ai.title}`
      );
    }
  } catch (e: any) {
    console.error("WhatsApp webhook error:", e);
    await admin.from("whatsapp_inbound_logs").insert({
      from_phone: fromPhone, to_phone: normalizePhone(toRaw), raw_message: body,
      matched_user_id: profile?.id ?? null, matched_board_id: board?.id ?? null,
      ai_extraction: ai as any, status: "error", error: String(e?.message ?? e),
    });
    return twiml("⚠️ SoMA: erro ao processar sua demanda. A equipe foi notificada.");
  }
});
