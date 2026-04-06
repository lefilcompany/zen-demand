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
    if (!authHeader) {
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

    const { board_id } = await req.json();
    if (!board_id) {
      return new Response(JSON.stringify({ error: "board_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch board data
    const [demandsRes, membersRes, boardRes] = await Promise.all([
      supabase
        .from("demands")
        .select("id, title, priority, due_date, created_at, status_id, demand_statuses(name)")
        .eq("board_id", board_id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("board_members")
        .select("user_id, role")
        .eq("board_id", board_id),
      supabase
        .from("boards")
        .select("name")
        .eq("id", board_id)
        .single(),
    ]);

    const demands = demandsRes.data || [];
    const members = membersRes.data || [];
    const boardName = boardRes.data?.name || "Quadro";

    // Calculate summary stats
    const statusCounts: Record<string, number> = {};
    let overdueCount = 0;
    const now = new Date();

    for (const d of demands) {
      const statusName = (d as any).demand_statuses?.name || "Sem status";
      statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      if (d.due_date && new Date(d.due_date) < now && statusName !== "Entregue") {
        overdueCount++;
      }
    }

    const totalMembers = members.length;
    const totalDemands = demands.length;

    const summaryText = `Quadro: ${boardName}
Total de demandas: ${totalDemands}
Membros: ${totalMembers}
Demandas atrasadas: ${overdueCount}
Status: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analista de produtividade. Gere exatamente 3 insights curtos e acionáveis baseados nos dados do quadro.
Responda APENAS com um JSON array de 3 objetos, sem markdown, sem code blocks.
Cada objeto deve ter: "title" (máx 6 palavras), "description" (máx 2 frases curtas), "type" (um de: "warning", "success", "info").
Foque em: prazos, gargalos, produtividade e distribuição de carga.
Se não houver dados suficientes, crie insights genéricos sobre boas práticas de gestão.`,
          },
          {
            role: "user",
            content: summaryText,
          },
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
