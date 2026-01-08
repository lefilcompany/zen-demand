import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Calendar, Filter, ChevronDown, ChevronUp, ExternalLink, CalendarIcon, Users, BarChart3, TrendingUp, Play, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
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
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface TimeEntryWithDetails {
  id: string;
  demand_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  demand: {
    id: string;
    title: string;
    status_id: string;
    priority: string | null;
    status: {
      name: string;
      color: string;
    };
  };
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface GroupedByDemand {
  demand: TimeEntryWithDetails["demand"];
  entries: TimeEntryWithDetails[];
  totalSeconds: number;
  users: Map<string, { profile: TimeEntryWithDetails["profile"]; totalSeconds: number }>;
}

interface GroupedByUser {
  profile: TimeEntryWithDetails["profile"];
  totalSeconds: number;
  demandIds: Set<string>;
  entries: TimeEntryWithDetails[];
  demands: Map<string, { demand: TimeEntryWithDetails["demand"]; totalSeconds: number; entries: TimeEntryWithDetails[] }>;
}

export default function TimeManagement() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<string>("users");

  // Fetch all time entries for the team
  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["team-time-entries", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];

      // First fetch time entries with demands
      const { data: entries, error: entriesError } = await supabase
        .from("demand_time_entries")
        .select(`
          *,
          demand:demands!inner(
            id,
            title,
            status_id,
            priority,
            team_id,
            status:demand_statuses(name, color)
          )
        `)
        .eq("demand.team_id", selectedTeamId)
        .order("started_at", { ascending: false });

      if (entriesError) throw entriesError;
      if (!entries || entries.length === 0) return [];

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(entries.map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine entries with profiles
      return entries.map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || { id: entry.user_id, full_name: "Usuário", avatar_url: null },
      })) as TimeEntryWithDetails[];
    },
    enabled: !!selectedTeamId,
  });

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!timeEntries) return [];
    const usersMap = new Map<string, TimeEntryWithDetails["profile"]>();
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

  // Group by user
  const groupedByUser = useMemo(() => {
    const userMap = new Map<string, GroupedByUser>();

    filteredEntries.forEach((entry) => {
      if (!entry.profile) return;

      const userId = entry.user_id;
      const duration = entry.ended_at
        ? Math.floor((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000)
        : 0;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          profile: entry.profile,
          totalSeconds: 0,
          demandIds: new Set(),
          entries: [],
          demands: new Map(),
        });
      }

      const userData = userMap.get(userId)!;
      userData.totalSeconds += duration;
      userData.demandIds.add(entry.demand_id);
      userData.entries.push(entry);

      // Track per-demand time for this user
      if (!userData.demands.has(entry.demand_id)) {
        userData.demands.set(entry.demand_id, {
          demand: entry.demand,
          totalSeconds: 0,
          entries: [],
        });
      }
      const demandData = userData.demands.get(entry.demand_id)!;
      demandData.totalSeconds += duration;
      demandData.entries.push(entry);
    });

    return Array.from(userMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredEntries]);

  // Group by demand
  const groupedByDemand = useMemo(() => {
    const grouped = new Map<string, GroupedByDemand>();

    filteredEntries.forEach((entry) => {
      const demandId = entry.demand_id;
      const duration = entry.ended_at
        ? Math.floor((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000)
        : 0;

      if (!grouped.has(demandId)) {
        grouped.set(demandId, {
          demand: entry.demand,
          entries: [],
          totalSeconds: 0,
          users: new Map(),
        });
      }

      const group = grouped.get(demandId)!;
      group.entries.push(entry);
      group.totalSeconds += duration;

      // Track per-user time
      if (entry.profile) {
        const userId = entry.user_id;
        if (!group.users.has(userId)) {
          group.users.set(userId, { profile: entry.profile, totalSeconds: 0 });
        }
        group.users.get(userId)!.totalSeconds += duration;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredEntries]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalTime = groupedByDemand.reduce((sum, group) => sum + group.totalSeconds, 0);
    const totalDemands = groupedByDemand.length;
    const totalEntries = groupedByDemand.reduce((sum, group) => sum + group.entries.length, 0);
    const activeUsers = groupedByUser.length;
    const avgTimePerUser = activeUsers > 0 ? Math.round(totalTime / activeUsers) : 0;
    const avgTimePerDemand = totalDemands > 0 ? Math.round(totalTime / totalDemands) : 0;
    
    // Count active timers
    const activeTimers = filteredEntries.filter(e => !e.ended_at).length;

    return { totalTime, totalDemands, totalEntries, activeUsers, avgTimePerUser, avgTimePerDemand, activeTimers };
  }, [groupedByDemand, groupedByUser, filteredEntries]);

  // Max time for progress calculation
  const maxUserTime = useMemo(() => {
    if (groupedByUser.length === 0) return 0;
    return groupedByUser[0].totalSeconds;
  }, [groupedByUser]);

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
      if (startDate && endDate) {
        doc.text(`Período: ${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`, pageWidth / 2, 28, { align: "center" });
      }
      
      // Stats summary
      doc.setFontSize(10);
      doc.setTextColor(60);
      const statsText = `Tempo Total: ${formatTimeDisplay(totals.totalTime)} | Usuários: ${totals.activeUsers} | Demandas: ${totals.totalDemands}`;
      doc.text(statsText, pageWidth / 2, 38, { align: "center" });

      // User time table
      const tableData = groupedByUser.map(user => [
        user.profile.full_name,
        user.demandIds.size.toString(),
        user.entries.length.toString(),
        formatTimeDisplay(user.totalSeconds)
      ]);

      autoTable(doc, {
        startY: 48,
        head: [["Usuário", "Demandas", "Entradas", "Tempo Total"]],
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

      doc.save(`relatorio-tempo-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
          <h1 className="text-2xl font-bold">Gerenciamento de Tempo</h1>
          <p className="text-muted-foreground">
            Acompanhe o tempo gasto por cada membro da equipe nas demandas.
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
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.totalTime)}
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
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
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
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.avgTimePerUser)}
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
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatTimeDisplay(totals.avgTimePerDemand)}
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

      {/* User Ranking Card */}
      {!isLoading && groupedByUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ranking de Tempo por Usuário
            </CardTitle>
            <CardDescription>
              Visualização rápida do tempo trabalhado por cada membro da equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedByUser.slice(0, 5).map((user, index) => {
                const percentage = maxUserTime > 0 ? (user.totalSeconds / maxUserTime) * 100 : 0;
                const hasActiveTimer = user.entries.some(e => !e.ended_at);
                
                return (
                  <div key={user.profile.id} className="flex items-center gap-4">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}º
                    </span>
                    <Avatar 
                      className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => navigate(`/user/${user.profile.id}`)}
                    >
                      <AvatarImage src={user.profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.profile.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/user/${user.profile.id}`)}
                          className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
                        >
                          {user.profile.full_name}
                        </button>
                        {hasActiveTimer && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] h-5">
                            <Play className="h-2.5 w-2.5 mr-0.5 fill-current" />
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold">{formatTimeDisplay(user.totalSeconds)}</span>
                      <div className="text-xs text-muted-foreground">
                        {user.demandIds.size} demanda{user.demandIds.size !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              {groupedByUser.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  E mais {groupedByUser.length - 5} usuário(s)...
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
              ) : groupedByUser.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma entrada de tempo encontrada.
                </p>
              ) : (
                <div className="space-y-2">
                  {groupedByUser.map((userData) => {
                    const hasActiveTimer = userData.entries.some(e => !e.ended_at);
                    
                    return (
                      <Collapsible
                        key={userData.profile.id}
                        open={expandedUsers.has(userData.profile.id)}
                        onOpenChange={() => toggleUser(userData.profile.id)}
                      >
                        <div className="border border-border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
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
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/user/${userData.profile.id}`);
                                      }}
                                      className="font-medium truncate hover:text-primary hover:underline cursor-pointer transition-colors"
                                    >
                                      {userData.profile.full_name}
                                    </button>
                                    {hasActiveTimer && (
                                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        <Play className="h-3 w-3 mr-1 fill-current" />
                                        Timer Ativo
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span>{userData.demandIds.size} demanda(s)</span>
                                    <span>{userData.entries.length} entrada(s)</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-lg">
                                  {formatTimeDisplay(userData.totalSeconds)}
                                </span>
                                {expandedUsers.has(userData.profile.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </Button>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t border-border bg-muted/30 p-4">
                              <h4 className="text-sm font-medium mb-4">Demandas Trabalhadas</h4>

                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Demanda</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Entradas</TableHead>
                                    <TableHead className="text-right">Tempo</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Array.from(userData.demands.values())
                                    .sort((a, b) => b.totalSeconds - a.totalSeconds)
                                    .map((demandData) => {
                                      const hasActive = demandData.entries.some(e => !e.ended_at);
                                      return (
                                        <TableRow key={demandData.demand.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <span className="truncate max-w-[200px]">
                                                {demandData.demand.title}
                                              </span>
                                              {hasActive && (
                                                <Play className="h-3 w-3 text-emerald-500 fill-current shrink-0" />
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant="outline"
                                              style={{
                                                borderColor: demandData.demand.status.color,
                                                color: demandData.demand.status.color,
                                              }}
                                            >
                                              {demandData.demand.status.name}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {demandData.entries.length}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {formatTimeDisplay(demandData.totalSeconds)}
                                          </TableCell>
                                          <TableCell>
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                              <Link to={`/demands/${demandData.demand.id}`}>
                                                <ExternalLink className="h-3.5 w-3.5" />
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Demanda */}
        <TabsContent value="demands" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tempo por Demanda</CardTitle>
              <CardDescription>
                Clique em uma demanda para ver os detalhes de tempo por usuário.
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
              ) : groupedByDemand.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma entrada de tempo encontrada.
                </p>
              ) : (
                <div className="space-y-2">
                  {groupedByDemand.map((group) => {
                    const hasActiveTimer = group.entries.some(e => !e.ended_at);
                    
                    return (
                      <Collapsible
                        key={group.demand.id}
                        open={expandedDemands.has(group.demand.id)}
                        onOpenChange={() => toggleDemand(group.demand.id)}
                      >
                        <div className="border border-border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium truncate">
                                      {group.demand.title}
                                    </span>
                                    {hasActiveTimer && (
                                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        <Play className="h-3 w-3 mr-1 fill-current" />
                                        Em Andamento
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      style={{
                                        borderColor: group.demand.status.color,
                                        color: group.demand.status.color,
                                      }}
                                    >
                                      {group.demand.status.name}
                                    </Badge>
                                    {group.demand.priority && (
                                      <Badge
                                        variant="secondary"
                                        className={priorityColors[group.demand.priority] || ""}
                                      >
                                        {group.demand.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span>{group.users.size} usuário(s)</span>
                                    <span>{group.entries.length} entrada(s)</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-lg">
                                  {formatTimeDisplay(group.totalSeconds)}
                                </span>
                                {expandedDemands.has(group.demand.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </Button>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t border-border bg-muted/30 p-4">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium">Tempo por Usuário</h4>
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/demands/${group.demand.id}`}>
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Ver Demanda
                                  </Link>
                                </Button>
                              </div>

                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead className="text-center">Entradas</TableHead>
                                    <TableHead className="text-right">Tempo Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Array.from(group.users.values())
                                    .sort((a, b) => b.totalSeconds - a.totalSeconds)
                                    .map(({ profile, totalSeconds }) => {
                                      const userEntries = group.entries.filter(
                                        (e) => e.user_id === profile.id
                                      );
                                      const hasActive = userEntries.some(e => !e.ended_at);
                                      return (
                                        <TableRow key={profile.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-6 w-6">
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
                                              <span className="text-sm">{profile.full_name}</span>
                                              {hasActive && (
                                                <Play className="h-3 w-3 text-emerald-500 fill-current" />
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {userEntries.length}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {formatTimeDisplay(totalSeconds)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                              </Table>

                              {/* Detailed entries */}
                              <details className="mt-4">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver todas as entradas ({group.entries.length})
                                </summary>
                                <div className="mt-2 space-y-1 text-sm">
                                  {group.entries.map((entry) => {
                                    const duration = entry.ended_at
                                      ? Math.floor(
                                          (new Date(entry.ended_at).getTime() -
                                            new Date(entry.started_at).getTime()) /
                                            1000
                                        )
                                      : 0;
                                    return (
                                      <div
                                        key={entry.id}
                                        className={cn(
                                          "flex items-center justify-between py-1.5 px-2 rounded",
                                          !entry.ended_at 
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" 
                                            : "bg-background"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          {!entry.ended_at && (
                                            <Play className="h-3 w-3 text-emerald-500 fill-current" />
                                          )}
                                          <span className="text-muted-foreground">
                                            {format(new Date(entry.started_at), "dd/MM HH:mm", {
                                              locale: ptBR,
                                            })}
                                            {" → "}
                                            {entry.ended_at
                                              ? format(new Date(entry.ended_at), "HH:mm", {
                                                  locale: ptBR,
                                                })
                                              : "em andamento"}
                                          </span>
                                          <Avatar className="h-4 w-4">
                                            <AvatarImage
                                              src={entry.profile?.avatar_url || undefined}
                                            />
                                            <AvatarFallback className="text-[8px]">
                                              {entry.profile?.full_name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>{entry.profile?.full_name}</span>
                                        </div>
                                        <span className="font-mono">
                                          {entry.ended_at ? formatTimeDisplay(duration) : "—"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
