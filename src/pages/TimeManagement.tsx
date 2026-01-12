import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Calendar, Filter, ChevronDown, ChevronUp, ExternalLink, CalendarIcon, Users, BarChart3, TrendingUp, Play, Download, LayoutGrid } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatTimeDisplay } from "@/hooks/useLiveTimer";
import { useBoardTimeEntries, useBoardUserTimeStats, BoardTimeEntry } from "@/hooks/useBoardTimeEntries";
import { LiveUserTimeRow } from "@/components/LiveUserTimeRow";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { cn, truncateText } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface GroupedByDemand {
  demand: BoardTimeEntry["demand"];
  entries: BoardTimeEntry[];
  totalSeconds: number;
  users: Map<string, { profile: BoardTimeEntry["profile"]; totalSeconds: number }>;
  hasActiveTimer: boolean;
}

export default function TimeManagement() {
  const navigate = useNavigate();
  const { selectedBoardId, currentBoard } = useSelectedBoard();
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<string>("users");

  // Fetch time entries for the board with realtime updates
  const { data: timeEntries, isLoading: entriesLoading } = useBoardTimeEntries(selectedBoardId);
  
  // Get user stats with live timer support
  const { data: userStats, isLoading: statsLoading, activeTimersCount } = useBoardUserTimeStats(selectedBoardId);

  const isLoading = entriesLoading || statsLoading;

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

    // Apply date range filter
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

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.demand.title.toLowerCase().includes(term) ||
          entry.profile?.full_name.toLowerCase().includes(term)
      );
    }

    // Apply user filter
    if (userFilter !== "all") {
      filtered = filtered.filter((entry) => entry.user_id === userFilter);
    }

    return filtered;
  }, [timeEntries, searchTerm, userFilter, startDate, endDate]);

  // Filter user stats based on filters
  const filteredUserStats = useMemo(() => {
    if (!userStats) return [];
    
    // If we have filters active, recalculate from filtered entries
    if (searchTerm || userFilter !== "all" || startDate || endDate) {
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

      // Set demand counts
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
  }, [userStats, filteredEntries, searchTerm, userFilter, startDate, endDate]);

  // Group by demand
  const groupedByDemand = useMemo(() => {
    const grouped = new Map<string, GroupedByDemand>();

    filteredEntries.forEach((entry) => {
      const demandId = entry.demand_id;
      const duration = entry.ended_at
        ? Math.floor((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000)
        : 0;
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

      // Track per-user time
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
    
    // Calculate from filtered user stats for accurate live time
    filteredUserStats.forEach(user => {
      totalTime += user.totalSeconds;
    });
    
    const totalDemands = groupedByDemand.length;
    const totalEntries = filteredEntries.length;
    const activeUsers = filteredUserStats.length;
    const avgTimePerUser = activeUsers > 0 ? Math.round(totalTime / activeUsers) : 0;
    const avgTimePerDemand = totalDemands > 0 ? Math.round(totalTime / totalDemands) : 0;
    
    const activeTimers = filteredUserStats.filter(u => u.isActive).length;

    return { totalTime, totalDemands, totalEntries, activeUsers, avgTimePerUser, avgTimePerDemand, activeTimers };
  }, [filteredUserStats, groupedByDemand, filteredEntries]);

  // Max time for progress calculation
  const maxUserTime = useMemo(() => {
    if (filteredUserStats.length === 0) return 0;
    return filteredUserStats[0].totalSeconds;
  }, [filteredUserStats]);

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

  const priorityColors: Record<string, string> = {
    alta: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    média: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    baixa: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text("Relatório de Tempo", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      
      // Board name
      if (currentBoard) {
        doc.text(`Quadro: ${currentBoard.name}`, pageWidth / 2, 28, { align: "center" });
      }
      
      if (startDate && endDate) {
        doc.text(`Período: ${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`, pageWidth / 2, 36, { align: "center" });
      }
      
      // Stats summary
      doc.setFontSize(10);
      doc.setTextColor(60);
      const statsText = `Tempo Total: ${formatTimeDisplay(totals.totalTime)} | Usuários: ${totals.activeUsers} | Demandas: ${totals.totalDemands}`;
      doc.text(statsText, pageWidth / 2, 46, { align: "center" });

      // User time table
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

      // Footer
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
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">Gerenciamento de Tempo</h1>
            {activeTimersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse"
              >
                <Play className="h-3 w-3 mr-1 fill-current" />
                {activeTimersCount} timer{activeTimersCount > 1 ? 's' : ''} ativo{activeTimersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutGrid className="h-4 w-4" />
            <span>Quadro: <span className="font-medium text-foreground">{currentBoard?.name || "Selecione um quadro"}</span></span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o tempo em tempo real dos membros deste quadro.
          </p>
        </div>
        <Button onClick={exportToPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.totalTime) || "00:00:00:00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários Ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totals.activeUsers}
              </div>
              {totals.activeTimers > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse">
                  <Play className="h-3 w-3 mr-1 fill-current" />
                  {totals.activeTimers} ativo{totals.activeTimers > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Média/Usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.avgTimePerUser) || "00:00:00:00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Média/Demanda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.avgTimePerDemand) || "00:00:00:00"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
          </div>
        </CardContent>
      </Card>

      {/* User Ranking Card - Real-time */}
      {!isLoading && filteredUserStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ranking de Tempo em Tempo Real
              {activeTimersCount > 0 && (
                <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-300">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                  Ao vivo
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Os tempos atualizam automaticamente quando há timers ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredUserStats.slice(0, 10).map((stats, index) => (
                <LiveUserTimeRow 
                  key={stats.userId} 
                  stats={stats} 
                  rank={index + 1}
                />
              ))}
              {filteredUserStats.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-4">
                  E mais {filteredUserStats.length - 10} usuário(s)...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
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
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma entrada de tempo encontrada para este quadro.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredUserStats.map((userData) => (
                    <Collapsible
                      key={userData.userId}
                      open={expandedUsers.has(userData.userId)}
                      onOpenChange={() => toggleUser(userData.userId)}
                    >
                      <div className="border border-border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                              <div className="relative">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={userData.profile.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {userData.profile.full_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {userData.isActive && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/user/${userData.userId}`);
                                    }}
                                    className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
                                  >
                                    {userData.profile.full_name}
                                  </button>
                                  {userData.isActive && (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] h-5">
                                      <Play className="h-2.5 w-2.5 mr-0.5 fill-current" />
                                      Timer Ativo
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {userData.demandCount} demanda{userData.demandCount !== 1 ? 's' : ''} • {userData.entries.length} entrada{userData.entries.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-mono font-bold",
                                userData.isActive && "text-emerald-600 dark:text-emerald-400"
                              )}>
                                {formatTimeDisplay(userData.totalSeconds) || "00:00:00:00"}
                              </span>
                              {expandedUsers.has(userData.userId) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t border-border bg-muted/30 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Demanda</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Prioridade</TableHead>
                                  <TableHead className="text-right">Tempo</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {/* Group entries by demand */}
                                {(() => {
                                  const demandMap = new Map<string, { demand: BoardTimeEntry["demand"]; totalSeconds: number; hasActive: boolean }>();
                                  userData.entries.forEach(entry => {
                                    const d = demandMap.get(entry.demand_id) || { 
                                      demand: entry.demand, 
                                      totalSeconds: 0, 
                                      hasActive: false 
                                    };
                                    d.totalSeconds += entry.duration_seconds || 0;
                                    if (!entry.ended_at) d.hasActive = true;
                                    demandMap.set(entry.demand_id, d);
                                  });
                                  
                                  return Array.from(demandMap.values()).map(({ demand, totalSeconds, hasActive }) => (
                                    <TableRow key={demand.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium" title={demand.title}>{truncateText(demand.title)}</span>
                                          {hasActive && (
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          style={{
                                            borderColor: demand.status?.color,
                                            color: demand.status?.color,
                                          }}
                                        >
                                          {demand.status?.name || "—"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {demand.priority && (
                                          <Badge className={priorityColors[demand.priority.toLowerCase()] || "bg-muted"}>
                                            {demand.priority}
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className={cn(
                                        "text-right font-mono",
                                        hasActive && "text-emerald-600 dark:text-emerald-400"
                                      )}>
                                        {formatTimeDisplay(totalSeconds) || "00:00:00:00"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          asChild
                                        >
                                          <Link to={`/demands/${demand.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ));
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
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
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma entrada de tempo encontrada para este quadro.
                </p>
              ) : (
                <div className="space-y-2">
                  {groupedByDemand.map((demandData) => (
                    <Collapsible
                      key={demandData.demand.id}
                      open={expandedDemands.has(demandData.demand.id)}
                      onOpenChange={() => toggleDemand(demandData.demand.id)}
                    >
                      <div className="border border-border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/demands/${demandData.demand.id}`);
                                    }}
                                    className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
                                    title={demandData.demand.title}
                                  >
                                    {truncateText(demandData.demand.title)}
                                  </button>
                                  {demandData.hasActiveTimer && (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] h-5">
                                      <Play className="h-2.5 w-2.5 mr-0.5 fill-current" />
                                      Timer Ativo
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    style={{
                                      borderColor: demandData.demand.status?.color,
                                      color: demandData.demand.status?.color,
                                    }}
                                  >
                                    {demandData.demand.status?.name || "—"}
                                  </Badge>
                                  {demandData.demand.priority && (
                                    <Badge className={priorityColors[demandData.demand.priority.toLowerCase()] || "bg-muted"}>
                                      {demandData.demand.priority}
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {demandData.users.size} usuário{demandData.users.size !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-mono font-bold",
                                demandData.hasActiveTimer && "text-emerald-600 dark:text-emerald-400"
                              )}>
                                {formatTimeDisplay(demandData.totalSeconds) || "00:00:00:00"}
                              </span>
                              {expandedDemands.has(demandData.demand.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t border-border bg-muted/30 p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Usuário</TableHead>
                                  <TableHead className="text-right">Tempo</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.from(demandData.users.entries()).map(([userId, { profile, totalSeconds }]) => {
                                  const hasActive = demandData.entries.some(e => e.user_id === userId && !e.ended_at);
                                  return (
                                    <TableRow key={userId}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="relative">
                                            <Avatar className="h-8 w-8">
                                              <AvatarImage src={profile.avatar_url || undefined} />
                                              <AvatarFallback className="text-xs">
                                                {profile.full_name
                                                  .split(" ")
                                                  .map((n) => n[0])
                                                  .join("")
                                                  .slice(0, 2)
                                                  .toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            {hasActive && (
                                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
                                            )}
                                          </div>
                                          <span className="font-medium">{profile.full_name}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className={cn(
                                        "text-right font-mono",
                                        hasActive && "text-emerald-600 dark:text-emerald-400"
                                      )}>
                                        {formatTimeDisplay(totalSeconds) || "00:00:00:00"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          asChild
                                        >
                                          <Link to={`/user/${userId}`}>
                                            <ExternalLink className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {!isLoading && !selectedBoardId && (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecione um Quadro</h3>
            <p className="text-muted-foreground">
              Selecione um quadro na barra lateral para visualizar o gerenciamento de tempo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
