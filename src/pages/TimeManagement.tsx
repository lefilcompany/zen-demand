import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { 
  Clock, User, Calendar, Filter, ChevronDown, ExternalLink, CalendarIcon, 
  Users, BarChart3, TrendingUp, Play, Download, LayoutGrid, CheckCircle2, 
  CircleDashed, Timer, Zap, Target, Activity, Flame, Trophy, Shield, 
  ArrowLeft, Radio
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useIsTeamAdminOrModerator } from "@/hooks/useTeamRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeDisplay, useLiveTimer } from "@/hooks/useLiveTimer";
import { useBoardTimeEntries, useBoardUserTimeStats, BoardTimeEntry } from "@/hooks/useBoardTimeEntries";
import { LiveUserTimeRow } from "@/components/LiveUserTimeRow";
import { UserDetailTimeRow } from "@/components/UserDetailTimeRow";
import { DemandDetailTimeRow } from "@/components/DemandDetailTimeRow";
import { ActiveDemandCard } from "@/components/ActiveDemandCard";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { cn, truncateText } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface GroupedByDemand {
  demand: BoardTimeEntry["demand"];
  entries: BoardTimeEntry[];
  totalSeconds: number;
  users: Map<string, { profile: BoardTimeEntry["profile"]; totalSeconds: number }>;
  hasActiveTimer: boolean;
}

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{payload[0].payload.fullName || label}</p>
        <p className="text-primary font-mono text-sm">
          {formatTimeDisplay(payload[0].value) || `${payload[0].value} min`}
        </p>
      </div>
    );
  }
  return null;
};

export default function TimeManagement() {
  const navigate = useNavigate();
  const { selectedBoardId, currentBoard, currentTeamId } = useSelectedBoard();
  const { canManage, isLoading: roleLoading } = useIsTeamAdminOrModerator(currentTeamId);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<string>("users");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  // Fetch time entries for the board with realtime updates
  const { data: timeEntries, isLoading: entriesLoading } = useBoardTimeEntries(selectedBoardId);
  
  // Get user stats with live timer support
  const { data: userStats, isLoading: statsLoading, activeTimersCount } = useBoardUserTimeStats(selectedBoardId);

  const isLoading = entriesLoading || statsLoading || roleLoading;

  // ============ ACCESS CONTROL ============
  // Block access if not admin/moderator
  if (!roleLoading && !canManage && selectedBoardId) {
    return (
      <div className="container mx-auto py-6">
        <PageBreadcrumb items={[{ label: "Gerenciamento de Tempo" }]} />
        <Card className="mt-6 border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Apenas administradores e coordenadores podem acessar o gerenciamento de tempo da equipe.
            </p>
            <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!timeEntries) return [];
    const usersMap = new Map<string, BoardTimeEntry["profile"]>();
    timeEntries.forEach((entry) => {
      if (entry.profile && !usersMap.has(entry.profile.id)) {
        usersMap.set(entry.profile.id, entry.profile);
      }
    });
    return Array.from(usersMap.values());
  }, [timeEntries]);

  // Filter entries based on date and search
  const filteredEntries = useMemo(() => {
    if (!timeEntries) return [];

    let filtered = timeEntries;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((entry) => new Date(entry.started_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((entry) => new Date(entry.started_at) <= end);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.demand.title.toLowerCase().includes(term) ||
          entry.profile?.full_name.toLowerCase().includes(term)
      );
    }

    if (userFilter !== "all") {
      filtered = filtered.filter((entry) => entry.user_id === userFilter);
    }

    if (deliveryFilter === "delivered") {
      filtered = filtered.filter((entry) => 
        entry.demand.status?.name?.toLowerCase() === "entregue"
      );
    } else if (deliveryFilter === "not_delivered") {
      filtered = filtered.filter((entry) => 
        entry.demand.status?.name?.toLowerCase() !== "entregue"
      );
    }

    return filtered;
  }, [timeEntries, searchTerm, userFilter, startDate, endDate, deliveryFilter]);

  // Active demands (demandas com timer ativo)
  const activeDemands = useMemo(() => {
    if (!timeEntries) return [];
    
    const activeMap = new Map<string, { entry: BoardTimeEntry; totalSeconds: number }>();
    
    timeEntries.filter(e => !e.ended_at).forEach(entry => {
      if (!activeMap.has(entry.demand_id)) {
        const demandEntries = timeEntries.filter(e => e.demand_id === entry.demand_id);
        const totalSeconds = demandEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
        activeMap.set(entry.demand_id, { entry, totalSeconds });
      }
    });
    
    return Array.from(activeMap.values());
  }, [timeEntries]);

  // Filter user stats based on filters
  const filteredUserStats = useMemo(() => {
    if (!userStats) return [];
    
    if (searchTerm || userFilter !== "all" || startDate || endDate || deliveryFilter !== "all") {
      const userMap = new Map<string, typeof userStats[0]>();
      const userDemands = new Map<string, Set<string>>();

      for (const entry of filteredEntries) {
        const userId = entry.user_id;
        const existing = userMap.get(userId);
        
        const entrySeconds = entry.duration_seconds || 0;
        const isActive = !entry.ended_at;

        if (!userDemands.has(userId)) {
          userDemands.set(userId, new Set());
        }
        userDemands.get(userId)!.add(entry.demand_id);
        
        if (existing) {
          existing.totalSeconds += entrySeconds;
          existing.entries.push(entry);
          if (isActive && !existing.isActive) {
            existing.isActive = true;
            existing.activeStartedAt = entry.started_at;
          }
        } else {
          userMap.set(userId, {
            userId,
            profile: entry.profile,
            totalSeconds: entrySeconds,
            isActive,
            activeStartedAt: isActive ? entry.started_at : null,
            demandCount: 0,
            entries: [entry],
          });
        }
      }

      for (const [userId, stats] of userMap) {
        stats.demandCount = userDemands.get(userId)?.size || 0;
      }

      return Array.from(userMap.values()).sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.totalSeconds - a.totalSeconds;
      });
    }

    return userStats;
  }, [userStats, filteredEntries, searchTerm, userFilter, startDate, endDate, deliveryFilter]);

  // Group by demand
  const groupedByDemand = useMemo(() => {
    const grouped = new Map<string, GroupedByDemand>();

    filteredEntries.forEach((entry) => {
      const demandId = entry.demand_id;
      const duration = entry.duration_seconds || 0;
      const isActive = !entry.ended_at;

      if (!grouped.has(demandId)) {
        grouped.set(demandId, {
          demand: entry.demand,
          entries: [],
          totalSeconds: 0,
          users: new Map(),
          hasActiveTimer: false,
        });
      }

      const group = grouped.get(demandId)!;
      group.entries.push(entry);
      group.totalSeconds += duration;
      if (isActive) group.hasActiveTimer = true;

      if (entry.profile) {
        const userId = entry.user_id;
        if (!group.users.has(userId)) {
          group.users.set(userId, { profile: entry.profile, totalSeconds: 0 });
        }
        group.users.get(userId)!.totalSeconds += duration;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.hasActiveTimer && !b.hasActiveTimer) return -1;
      if (!a.hasActiveTimer && b.hasActiveTimer) return 1;
      return b.totalSeconds - a.totalSeconds;
    });
  }, [filteredEntries]);

  // Calculate totals with live time consideration
  const totals = useMemo(() => {
    let totalTime = 0;
    let earliestActiveStart: string | null = null;
    
    filteredUserStats.forEach(user => {
      totalTime += user.totalSeconds;
      if (user.isActive && user.activeStartedAt) {
        if (!earliestActiveStart || new Date(user.activeStartedAt) < new Date(earliestActiveStart)) {
          earliestActiveStart = user.activeStartedAt;
        }
      }
    });
    
    const totalDemands = groupedByDemand.length;
    const totalEntries = filteredEntries.length;
    const activeUsers = filteredUserStats.length;
    const avgTimePerUser = activeUsers > 0 ? Math.round(totalTime / activeUsers) : 0;
    const avgTimePerDemand = totalDemands > 0 ? Math.round(totalTime / totalDemands) : 0;
    
    const activeTimers = filteredUserStats.filter(u => u.isActive).length;

    return { 
      totalTime, 
      totalDemands, 
      totalEntries, 
      activeUsers, 
      avgTimePerUser, 
      avgTimePerDemand, 
      activeTimers,
      earliestActiveStart 
    };
  }, [filteredUserStats, groupedByDemand, filteredEntries]);

  // Live timer for total time
  const liveTotalTime = useLiveTimer({
    isActive: totals.activeTimers > 0,
    baseSeconds: totals.totalTime,
    lastStartedAt: totals.earliestActiveStart,
  });

  // Max time for progress calculation
  const maxUserTime = useMemo(() => {
    if (filteredUserStats.length === 0) return 0;
    return filteredUserStats[0].totalSeconds;
  }, [filteredUserStats]);

  // Chart colors
  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(221, 83%, 53%)',
    'hsl(263, 70%, 50%)',
    'hsl(38, 92%, 50%)',
    'hsl(160, 84%, 39%)',
    'hsl(340, 82%, 52%)',
  ];

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleDemand = (demandId: string) => {
    setExpandedDemands((prev) => {
      const next = new Set(prev);
      if (next.has(demandId)) {
        next.delete(demandId);
      } else {
        next.add(demandId);
      }
      return next;
    });
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Relatório de Tempo", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      
      if (currentBoard) {
        doc.text(`Quadro: ${currentBoard.name}`, pageWidth / 2, 28, { align: "center" });
      }
      
      if (startDate && endDate) {
        doc.text(`Período: ${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`, pageWidth / 2, 36, { align: "center" });
      }
      
      doc.setFontSize(10);
      doc.setTextColor(60);
      const statsText = `Tempo Total: ${formatTimeDisplay(totals.totalTime)} | Usuários: ${totals.activeUsers} | Demandas: ${totals.totalDemands}`;
      doc.text(statsText, pageWidth / 2, 46, { align: "center" });

      const tableData = filteredUserStats.map(user => [
        user.profile.full_name,
        user.demandCount.toString(),
        user.entries.length.toString(),
        formatTimeDisplay(user.totalSeconds) || "00:00:00:00",
        user.isActive ? "Sim" : "Não"
      ]);

      autoTable(doc, {
        startY: 56,
        head: [["Usuário", "Demandas", "Entradas", "Tempo Total", "Timer Ativo"]],
        body: tableData,
        theme: "striped",
        headStyles: { 
          fillColor: [242, 135, 5],
          textColor: 255,
          fontStyle: "bold"
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} | Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`relatorio-tempo-${currentBoard?.name || 'board'}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageBreadcrumb items={[{ label: "Gerenciamento de Tempo" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Timer className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gerenciamento de Tempo</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <LayoutGrid className="h-4 w-4" />
                <span>Quadro: <span className="font-medium text-foreground">{currentBoard?.name || "Selecione um quadro"}</span></span>
                {activeTimersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse ml-2"
                  >
                    <Radio className="h-3 w-3 mr-1" />
                    {activeTimersCount} ativo{activeTimersCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button onClick={exportToPDF} variant="outline" className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* ============ LIVE ACTIVITY SECTION ============ */}
      {activeDemands.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Atividade ao Vivo
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Demandas sendo trabalhadas agora
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDemands.slice(0, 6).map(({ entry, totalSeconds }) => (
              <ActiveDemandCard 
                key={entry.demand_id} 
                entry={entry} 
                demandTotalSeconds={totalSeconds} 
              />
            ))}
          </div>
          
          {activeDemands.length > 6 && (
            <p className="text-sm text-muted-foreground text-center">
              E mais {activeDemands.length - 6} demanda(s) ativa(s)...
            </p>
          )}
        </div>
      )}

      {/* ============ STATS CARDS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Time Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-primary font-medium">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Timer className="h-4 w-4 text-primary" />
              </div>
              Tempo Total
              {totals.activeTimers > 0 && (
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl md:text-3xl font-bold font-mono tabular-nums",
              totals.activeTimers > 0 && "text-emerald-600 dark:text-emerald-400"
            )}>
              {isLoading ? <Skeleton className="h-8 w-28" /> : liveTotalTime || formatTimeDisplay(totals.totalTime) || "00:00:00:00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalEntries} entrada{totals.totalEntries !== 1 ? 's' : ''} registrada{totals.totalEntries !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Active Users Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              Usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totals.activeUsers}
              </div>
              {totals.activeTimers > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse text-xs">
                  <Flame className="h-3 w-3 mr-1" />
                  {totals.activeTimers} ativo{totals.activeTimers > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalDemands} demanda{totals.totalDemands !== 1 ? 's' : ''} trabalhada{totals.totalDemands !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Average per User Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium">
              <div className="p-1.5 rounded-md bg-violet-500/10">
                <TrendingUp className="h-4 w-4 text-violet-500" />
              </div>
              Média/Usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatTimeDisplay(totals.avgTimePerUser) || "00:00:00:00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo médio por colaborador
            </p>
          </CardContent>
        </Card>

        {/* Average per Demand Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <Target className="h-4 w-4 text-amber-500" />
              </div>
              Média/Demanda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatTimeDisplay(totals.avgTimePerDemand) || "00:00:00:00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo médio por tarefa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============ CHARTS SECTION ============ */}
      {!isLoading && filteredUserStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Distribution Chart */}
          <Card className="border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                Distribuição de Tempo por Usuário
              </CardTitle>
              <CardDescription>
                Proporção do tempo dedicado por cada membro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredUserStats.slice(0, 6).map((user, index) => ({
                        name: user.profile.full_name.split(' ')[0],
                        value: user.totalSeconds,
                        fullName: user.profile.full_name,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {filteredUserStats.slice(0, 6).map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {filteredUserStats.slice(0, 6).map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-1.5 text-sm">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{user.profile.full_name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Top Demands */}
          <Card className="border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                Top Demandas por Tempo
              </CardTitle>
              <CardDescription>
                Demandas que mais consumiram tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={groupedByDemand.slice(0, 5).map((d) => ({
                      name: truncateText(d.demand.title, 18),
                      tempo: Math.round(d.totalSeconds / 60),
                      fullTitle: d.demand.title,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 30 }}
                  >
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => `${v}min`}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value} minutos`, 'Tempo']}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullTitle || label}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="tempo" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 6, 6, 0]}
                      background={{ fill: 'hsl(var(--muted))', radius: 6 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ USER RANKING ============ */}
      {!isLoading && filteredUserStats.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    Ranking em Tempo Real
                    {activeTimersCount > 0 && (
                      <Badge className="bg-emerald-500 text-white border-0 animate-pulse text-xs">
                        <span className="w-2 h-2 bg-white rounded-full mr-1.5" />
                        Ao vivo
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Os tempos atualizam automaticamente quando há timers ativos
                  </CardDescription>
                </div>
              </div>
              {filteredUserStats.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Líder atual</p>
                  <p className="font-semibold text-amber-600 dark:text-amber-400 text-lg">
                    {filteredUserStats[0]?.profile.full_name.split(' ')[0]}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredUserStats.slice(0, 10).map((stats, index) => (
                <LiveUserTimeRow 
                  key={stats.userId} 
                  stats={stats} 
                  rank={index + 1}
                  maxTime={maxUserTime}
                />
              ))}
              {filteredUserStats.length > 10 && (
                <div className="text-center pt-4 pb-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    E mais {filteredUserStats.length - 10} usuário(s)...
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ FILTERS ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por demanda ou usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Status de entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <CircleDashed className="h-4 w-4" />
                      Todas as demandas
                    </div>
                  </SelectItem>
                  <SelectItem value="delivered">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Somente entregues
                    </div>
                  </SelectItem>
                  <SelectItem value="not_delivered">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-blue-600" />
                      Somente não entregues
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Período:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                >
                  Limpar datas
                </Button>
              )}
            </div>
            
            {(searchTerm || userFilter !== "all" || deliveryFilter !== "all" || startDate || endDate) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setUserFilter("all");
                    setDeliveryFilter("all");
                    setStartDate(startOfMonth(new Date()));
                    setEndDate(endOfMonth(new Date()));
                  }}
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ============ DETAILED TABS ============ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Por Usuário
          </TabsTrigger>
          <TabsTrigger value="demands" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Por Demanda
          </TabsTrigger>
        </TabsList>

        {/* Tab: Por Usuário */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Usuário</CardTitle>
              <CardDescription>
                Clique em um usuário para ver as demandas trabalhadas.
                {startDate && endDate && (
                  <span className="ml-2 text-xs">
                    (Período: {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredUserStats.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma entrada de tempo encontrada para este quadro.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUserStats.map((userData) => (
                    <UserDetailTimeRow
                      key={userData.userId}
                      userData={userData}
                      isExpanded={expandedUsers.has(userData.userId)}
                      onToggle={() => toggleUser(userData.userId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Demanda */}
        <TabsContent value="demands" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Demanda</CardTitle>
              <CardDescription>
                Clique em uma demanda para ver os usuários que trabalharam nela.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : groupedByDemand.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma demanda encontrada com tempo registrado.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedByDemand.map((demandData) => (
                    <DemandDetailTimeRow
                      key={demandData.demand.id}
                      demandData={demandData}
                      isExpanded={expandedDemands.has(demandData.demand.id)}
                      onToggle={() => toggleDemand(demandData.demand.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
