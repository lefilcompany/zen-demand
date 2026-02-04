import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemandMetrics {
  total: number;
  delivered: number;
  onTime: number;
  late: number;
  overdue: number;
  avgDeliveryDays: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

interface MemberPerformance {
  name: string;
  role: string;
  demandCount: number;
  completedCount: number;
  completionRate: number;
  avgTimeHours: number;
}

interface RequesterStats {
  name: string;
  requestCount: number;
  pending: number;
  approved: number;
  rejected: number;
  avgPerWeek: number;
}

interface TimeTrackingStats {
  totalHours: number;
  byExecutor: { name: string; hours: number; demandCount: number }[];
  avgHoursPerDemand: number;
}

interface BoardAnalytics {
  board: { name: string; description: string | null; monthlyLimit: number | null };
  period: { start: string; end: string; days: number };
  demands: DemandMetrics;
  members: MemberPerformance[];
  requesters: RequesterStats[];
  timeTracking: TimeTrackingStats;
  trends: {
    demandsByWeek: { week: string; count: number }[];
    deliveriesByWeek: { week: string; count: number }[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Failed to verify user:", userError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const { boardId } = await req.json();
    
    if (!boardId) {
      return new Response(
        JSON.stringify({ error: "boardId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to the board
    const { data: membership, error: membershipError } = await supabase
      .from("board_members")
      .select("user_id")
      .eq("board_id", boardId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("Error checking board membership:", membershipError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!membership) {
      console.error("User", userId, "is not a member of board", boardId);
      return new Response(
        JSON.stringify({ error: "Você não tem acesso a este quadro" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate period (last 90 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    // Get board info
    const { data: board, error: boardError } = await supabaseAdmin
      .from("boards")
      .select("id, name, description, monthly_demand_limit")
      .eq("id", boardId)
      .single();

    if (boardError || !board) {
      console.error("Board error:", boardError);
      return new Response(
        JSON.stringify({ error: "Quadro não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all demands with comprehensive data
    const { data: demands, error: demandsError } = await supabaseAdmin
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
        time_in_progress_seconds,
        status:demand_statuses(name),
        service:services(name),
        assignees:demand_assignees(
          user_id,
          profile:profiles(full_name)
        )
      `)
      .eq("board_id", boardId)
      .eq("archived", false)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (demandsError) {
      console.error("Demands error:", demandsError);
    }

    // Get board members with roles
    const { data: members, error: membersError } = await supabaseAdmin
      .from("board_members")
      .select(`
        user_id,
        role,
        profile:profiles(full_name, avatar_url)
      `)
      .eq("board_id", boardId);

    if (membersError) {
      console.error("Members error:", membersError);
    }

    // Get time entries for the board
    const { data: timeEntries, error: timeError } = await supabaseAdmin
      .from("demand_time_entries")
      .select(`
        user_id,
        demand_id,
        duration_seconds,
        started_at,
        ended_at,
        demand:demands!inner(board_id)
      `)
      .eq("demand.board_id", boardId)
      .not("duration_seconds", "is", null);

    if (timeError) {
      console.error("Time entries error:", timeError);
    }

    // Get demand requests
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("demand_requests")
      .select(`
        id,
        title,
        status,
        priority,
        created_at,
        created_by,
        creator:profiles!demand_requests_created_by_fkey(full_name)
      `)
      .eq("board_id", boardId)
      .gte("created_at", startDate.toISOString());

    if (requestsError) {
      console.error("Requests error:", requestsError);
    }

    // Calculate demand metrics
    const demandsList = demands || [];
    const now = new Date();
    
    let delivered = 0;
    let onTime = 0;
    let late = 0;
    let overdue = 0;
    let totalDeliveryDays = 0;
    let deliveredWithDueDate = 0;

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    demandsList.forEach((d: any) => {
      const statusName = d.status?.name || "Sem status";
      statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;

      const priority = d.priority || "normal";
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

      if (d.delivered_at) {
        delivered++;
        const deliveredDate = new Date(d.delivered_at);
        const createdDate = new Date(d.created_at);
        const days = (deliveredDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        totalDeliveryDays += days;

        if (d.due_date) {
          deliveredWithDueDate++;
          const dueDate = new Date(d.due_date);
          if (deliveredDate <= dueDate) {
            onTime++;
          } else {
            late++;
          }
        }
      } else if (d.due_date) {
        const dueDate = new Date(d.due_date);
        if (dueDate < now) {
          overdue++;
        }
      }
    });

    const avgDeliveryDays = delivered > 0 ? totalDeliveryDays / delivered : 0;

    const demandMetrics: DemandMetrics = {
      total: demandsList.length,
      delivered,
      onTime,
      late,
      overdue,
      avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      byPriority: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
    };

    // Calculate member performance
    const memberPerformance: MemberPerformance[] = [];
    const memberTimeMap: Record<string, number> = {};

    // Calculate time per member
    (timeEntries || []).forEach((entry: any) => {
      if (entry.user_id && entry.duration_seconds) {
        memberTimeMap[entry.user_id] = (memberTimeMap[entry.user_id] || 0) + entry.duration_seconds;
      }
    });

    // Build assignee demand map
    const assigneeDemandMap: Record<string, { total: number; completed: number }> = {};
    demandsList.forEach((d: any) => {
      const assignees = d.assignees || [];
      const isDelivered = !!d.delivered_at;
      assignees.forEach((a: any) => {
        if (!assigneeDemandMap[a.user_id]) {
          assigneeDemandMap[a.user_id] = { total: 0, completed: 0 };
        }
        assigneeDemandMap[a.user_id].total++;
        if (isDelivered) {
          assigneeDemandMap[a.user_id].completed++;
        }
      });
    });

    (members || []).forEach((m: any) => {
      const profile = m.profile as any;
      const stats = assigneeDemandMap[m.user_id] || { total: 0, completed: 0 };
      const timeSeconds = memberTimeMap[m.user_id] || 0;
      const timeHours = timeSeconds / 3600;

      memberPerformance.push({
        name: profile?.full_name || "Usuário",
        role: m.role,
        demandCount: stats.total,
        completedCount: stats.completed,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        avgTimeHours: stats.completed > 0 ? Math.round((timeHours / stats.completed) * 10) / 10 : 0,
      });
    });

    // Calculate requester stats
    const requesterMap: Record<string, RequesterStats> = {};
    const weeksInPeriod = 90 / 7;

    (requests || []).forEach((r: any) => {
      const creatorName = (r.creator as any)?.full_name || "Usuário";
      if (!requesterMap[r.created_by]) {
        requesterMap[r.created_by] = {
          name: creatorName,
          requestCount: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          avgPerWeek: 0,
        };
      }
      requesterMap[r.created_by].requestCount++;
      if (r.status === "pending") requesterMap[r.created_by].pending++;
      if (r.status === "approved") requesterMap[r.created_by].approved++;
      if (r.status === "rejected") requesterMap[r.created_by].rejected++;
    });

    Object.values(requesterMap).forEach((r) => {
      r.avgPerWeek = Math.round((r.requestCount / weeksInPeriod) * 10) / 10;
    });

    const requesterStats = Object.values(requesterMap).sort((a, b) => b.requestCount - a.requestCount);

    // Calculate time tracking stats
    let totalTimeSeconds = 0;
    const executorTimeMap: Record<string, { name: string; seconds: number; demandCount: number }> = {};

    (timeEntries || []).forEach((entry: any) => {
      if (entry.duration_seconds) {
        totalTimeSeconds += entry.duration_seconds;
        
        if (!executorTimeMap[entry.user_id]) {
          const member = (members || []).find((m: any) => m.user_id === entry.user_id);
          const name = (member?.profile as any)?.full_name || "Usuário";
          executorTimeMap[entry.user_id] = { name, seconds: 0, demandCount: 0 };
        }
        executorTimeMap[entry.user_id].seconds += entry.duration_seconds;
      }
    });

    // Count unique demands per executor from time entries
    const executorDemands: Record<string, Set<string>> = {};
    (timeEntries || []).forEach((entry: any) => {
      if (!executorDemands[entry.user_id]) {
        executorDemands[entry.user_id] = new Set();
      }
      executorDemands[entry.user_id].add(entry.demand_id);
    });

    Object.entries(executorDemands).forEach(([userId, demandSet]) => {
      if (executorTimeMap[userId]) {
        executorTimeMap[userId].demandCount = demandSet.size;
      }
    });

    const timeTrackingStats: TimeTrackingStats = {
      totalHours: Math.round((totalTimeSeconds / 3600) * 10) / 10,
      byExecutor: Object.values(executorTimeMap).map((e) => ({
        name: e.name,
        hours: Math.round((e.seconds / 3600) * 10) / 10,
        demandCount: e.demandCount,
      })),
      avgHoursPerDemand: delivered > 0 
        ? Math.round(((totalTimeSeconds / 3600) / delivered) * 10) / 10 
        : 0,
    };

    // Calculate trends (demands by week)
    const weeklyDemands: Record<string, number> = {};
    const weeklyDeliveries: Record<string, number> = {};

    demandsList.forEach((d: any) => {
      const createdWeek = getWeekLabel(new Date(d.created_at));
      weeklyDemands[createdWeek] = (weeklyDemands[createdWeek] || 0) + 1;

      if (d.delivered_at) {
        const deliveredWeek = getWeekLabel(new Date(d.delivered_at));
        weeklyDeliveries[deliveredWeek] = (weeklyDeliveries[deliveredWeek] || 0) + 1;
      }
    });

    const analytics: BoardAnalytics = {
      board: {
        name: board.name,
        description: board.description,
        monthlyLimit: board.monthly_demand_limit,
      },
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        days: 90,
      },
      demands: demandMetrics,
      members: memberPerformance,
      requesters: requesterStats,
      timeTracking: timeTrackingStats,
      trends: {
        demandsByWeek: Object.entries(weeklyDemands)
          .map(([week, count]) => ({ week, count }))
          .sort((a, b) => a.week.localeCompare(b.week)),
        deliveriesByWeek: Object.entries(weeklyDeliveries)
          .map(([week, count]) => ({ week, count }))
          .sort((a, b) => a.week.localeCompare(b.week)),
      },
    };

    const systemPrompt = `Você é um especialista em análise de gestão de projetos e produtividade de equipes. 
Sua tarefa é analisar os dados de um quadro Kanban e produzir um relatório executivo completo e preciso em português brasileiro.

IMPORTANTE:
- Analise os dados com precisão - não invente números, use apenas os dados fornecidos
- Seja direto e objetivo, mas completo
- Destaque tanto pontos positivos quanto áreas de melhoria
- Use emojis de forma moderada para facilitar a leitura
- Formate em markdown com seções claras

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:

## 📊 Resumo Executivo
[2-3 frases resumindo a situação geral do quadro]

## 🎯 Métricas de Performance
- Taxa de entregas no prazo
- Tempo médio de conclusão
- Volume de demandas por status
- Prioridades mais comuns

## 👥 Análise da Equipe
Para cada role (Administradores, Moderadores, Executores):
- Quem está performando bem e por quê
- Quem pode precisar de suporte
- Taxa de conclusão por membro

## 📈 Padrões de Demanda
- Recorrência de solicitações por requester
- Tipos de demandas mais frequentes
- Tendências semanais observadas
- Picos de demanda identificados

## ⚠️ Alertas e Pontos de Atenção
- Demandas atrasadas ou críticas
- Gargalos identificados
- Riscos potenciais

## 💡 Recomendações
- Ações específicas para melhorar performance
- Sugestões de redistribuição de carga
- Otimizações de processo

REGRAS:
- Se não houver dados suficientes para uma seção, indique claramente
- Mantenha um tom profissional mas acessível
- Priorize insights acionáveis sobre descrições genéricas`;

    const userPrompt = `Analise os seguintes dados do quadro "${board.name}" dos últimos 90 dias:

${JSON.stringify(analytics, null, 2)}

Por favor, gere o relatório de análise completo seguindo a estrutura definida.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
        JSON.stringify({ error: "Erro ao gerar análise" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return analytics data as first event, then stream AI response
    const analyticsEvent = `data: ${JSON.stringify({ type: "analytics", data: analytics })}\n\n`;
    
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Write analytics first
    writer.write(encoder.encode(analyticsEvent));

    // Then pipe AI response
    const reader = response.body!.getReader();
    
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
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

function getWeekLabel(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-S${week.toString().padStart(2, "0")}`;
}
