import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const { board_id, is_requester } = await req.json();
    if (!board_id) {
      return new Response(JSON.stringify({ error: "board_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch board data — for requesters, only their own demands
    const demandsQuery = supabase
      .from("demands")
      .select("id, title, priority, due_date, created_at, delivered_at, status_id, service_id, services(name), demand_statuses(name)")
      .eq("board_id", board_id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (is_requester) {
      demandsQuery.eq("created_by", userId);
    }

    const [demandsRes, membersRes, boardRes, requestsRes] = await Promise.all([
      demandsQuery,
      supabase
        .from("board_members")
        .select("user_id, role")
        .eq("board_id", board_id),
      supabase
        .from("boards")
        .select("name, team_id")
        .eq("id", board_id)
        .single(),
      is_requester
        ? supabase
            .from("demand_requests")
            .select("id, status, created_at, title")
            .eq("created_by", userId)
            .eq("board_id", board_id)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    const demands = demandsRes.data || [];
    const members = membersRes.data || [];
    const boardName = boardRes.data?.name || "Quadro";
    const requests = requestsRes.data || [];

    // Calculate summary stats
    const statusCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};
    let overdueCount = 0;
    let deliveredCount = 0;
    const now = new Date();

    for (const d of demands) {
      const statusName = (d as any).demand_statuses?.name || "Sem status";
      const serviceName = (d as any).services?.name || "Sem serviço";
      statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
      if (d.delivered_at) deliveredCount++;
      if (d.due_date && new Date(d.due_date) < now && statusName !== "Entregue" && !d.delivered_at) {
        overdueCount++;
      }
    }

    const totalMembers = members.length;
    const totalDemands = demands.length;

    let summaryText: string;

    if (is_requester) {
      const requestStatusCounts: Record<string, number> = {};
      for (const r of requests as any[]) {
        requestStatusCounts[r.status] = (requestStatusCounts[r.status] || 0) + 1;
      }

      summaryText = `Quadro: ${boardName}
Visão do Cliente/Solicitante:
Total de demandas solicitadas: ${totalDemands}
Demandas entregues: ${deliveredCount}
Demandas atrasadas: ${overdueCount}
Status das demandas: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}
Serviços solicitados: ${Object.entries(serviceCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}
Solicitações recentes: ${(requests as any[]).length} (${Object.entries(requestStatusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")})`;
    } else {
      summaryText = `Quadro: ${boardName}
Total de demandas: ${totalDemands}
Membros: ${totalMembers}
Demandas atrasadas: ${overdueCount}
Status: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = is_requester
      ? `Você é um assistente de acompanhamento de serviços para clientes/solicitantes. Gere exatamente 3 insights curtos e úteis baseados nos dados das demandas do cliente.
Responda APENAS com um JSON array de 3 objetos, sem markdown, sem code blocks.
Cada objeto deve ter: "title" (máx 6 palavras), "description" (máx 2 frases curtas), "type" (um de: "warning", "success", "info").
Foque em: status das entregas, prazos, serviços mais solicitados, e andamento geral das solicitações do cliente.
Use linguagem amigável e voltada para o cliente. Não mencione membros internos da equipe.
Se não houver dados suficientes, crie insights sobre como acompanhar melhor as solicitações.`
      : `Você é um analista de produtividade. Gere exatamente 3 insights curtos e acionáveis baseados nos dados do quadro.
Responda APENAS com um JSON array de 3 objetos, sem markdown, sem code blocks.
Cada objeto deve ter: "title" (máx 6 palavras), "description" (máx 2 frases curtas), "type" (um de: "warning", "success", "info").
Foque em: prazos, gargalos, produtividade e distribuição de carga.
Se não houver dados suficientes, crie insights genéricos sobre boas práticas de gestão.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: summaryText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_insights",
              description: "Return 3 AI insights about the board",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string", enum: ["warning", "success", "info"] },
                      },
                      required: ["title", "description", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let insights = [];

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        insights = parsed.insights || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      insights = [
        { title: "Acompanhe os prazos", description: "Verifique regularmente as demandas com prazo próximo para evitar atrasos.", type: "info" },
        { title: "Distribua a carga", description: "Equilibre as demandas entre os membros da equipe para maior produtividade.", type: "info" },
        { title: "Revise entregas", description: "Analise as demandas entregues para identificar padrões de melhoria.", type: "success" },
      ];
    }

    return new Response(JSON.stringify({ insights: insights.slice(0, 3) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
