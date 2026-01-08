import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boardId } = await req.json();
    
    if (!boardId) {
      return new Response(
        JSON.stringify({ error: "boardId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get board info
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("id, name, description")
      .eq("id", boardId)
      .single();

    if (boardError) {
      console.error("Board error:", boardError);
      return new Response(
        JSON.stringify({ error: "Board not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get demands with status
    const { data: demands, error: demandsError } = await supabase
      .from("demands")
      .select(`
        id,
        title,
        description,
        priority,
        created_at,
        delivered_at,
        due_date,
        archived,
        status:demand_statuses(name),
        service:services(name),
        assignees:demand_assignees(
          profile:profiles(full_name)
        )
      `)
      .eq("board_id", boardId)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (demandsError) {
      console.error("Demands error:", demandsError);
    }

    // Get pending requests
    const { data: requests, error: requestsError } = await supabase
      .from("demand_requests")
      .select("id, title, status, priority, created_at")
      .eq("board_id", boardId)
      .eq("status", "pending")
      .limit(20);

    if (requestsError) {
      console.error("Requests error:", requestsError);
    }

    // Prepare context for AI
    const demandsContext = (demands || []).map(d => ({
      title: d.title,
      status: (d.status as any)?.name || "Unknown",
      priority: d.priority,
      service: (d.service as any)?.name,
      assignees: (d.assignees as any[])?.map(a => a.profile?.full_name).filter(Boolean).join(", "),
      dueDate: d.due_date,
      delivered: !!d.delivered_at
    }));

    const requestsContext = (requests || []).map(r => ({
      title: r.title,
      priority: r.priority,
      createdAt: r.created_at
    }));

    const systemPrompt = `Você é um assistente de gestão de projetos especializado em resumir o status de quadros Kanban. 
Analise os dados fornecidos e gere um resumo executivo claro e conciso em português brasileiro.

O resumo deve incluir (nesta ordem):
1. 🎉 CONQUISTAS E DESTAQUES - Comece sempre com as coisas boas! Demandas concluídas, metas atingidas, progresso feito
2. 📊 Visão geral do quadro (quantas demandas, distribuição por status)
3. ⭐ Pontos positivos - Destaque o que está funcionando bem, equipe produtiva, entregas no prazo
4. 🚀 Progresso da equipe - Demandas em andamento, esforços em curso
5. ⚠️ Pontos de atenção (apenas se houver algo crítico)
6. 💡 Recomendações ou próximos passos sugeridos

IMPORTANTE: 
- Mantenha um tom POSITIVO e motivador
- Celebre as conquistas antes de mencionar problemas
- Use emojis para tornar o resumo mais visual
- Destaque números positivos (ex: "Excelente! 5 demandas entregues!")
- Se a equipe está produzindo bem, elogie isso
- Minimize críticas, foque em oportunidades de melhoria

Seja direto, use bullet points quando apropriado, e mantenha a energia positiva!`;

    const userPrompt = `Quadro: ${board.name}
${board.description ? `Descrição: ${board.description}` : ""}

Demandas ativas (${demandsContext.length}):
${JSON.stringify(demandsContext, null, 2)}

Solicitações pendentes (${requestsContext.length}):
${JSON.stringify(requestsContext, null, 2)}

Por favor, gere um resumo executivo deste quadro.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar resumo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("board-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
