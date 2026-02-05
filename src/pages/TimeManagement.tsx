import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Timer, Download, LayoutGrid, Radio, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useIsTeamAdminOrModerator } from "@/hooks/useTeamRole";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeDisplay, useLiveTimer } from "@/hooks/useLiveTimer";
import { useBoardTimeEntries, useBoardMembersWithTime, BoardTimeEntry, BoardMemberWithTime } from "@/hooks/useBoardTimeEntries";
import { useBoardTimeStats } from "@/hooks/useBoardTimeStats";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { 
  StatsOverviewCards, 
  ActiveWorkSection, 
  MemberRanking, 
  PerformanceCharts, 
  TimeFilters,
  TimeDetailTabs 
} from "@/components/time-management";
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
  const { selectedBoardId, currentBoard, currentTeamId } = useSelectedBoard();
  const { canManage, isLoading: roleLoading } = useIsTeamAdminOrModerator(currentTeamId);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<string>("users");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  // Fetch time entries for the board with realtime updates
  const { data: timeEntries, isLoading: entriesLoading } = useBoardTimeEntries(selectedBoardId);
  
  // Get ALL board members with their time stats (including those with 0 time)
  const { data: allBoardMembers, isLoading: membersLoading, activeTimersCount } = useBoardMembersWithTime(selectedBoardId);
  
  // Get aggregated stats for charts
  const { stats: boardStats, isLoading: statsLoading } = useBoardTimeStats(selectedBoardId);

  const isLoading = entriesLoading || membersLoading || roleLoading || statsLoading;

  // Get unique users for filter (from all board members)
  const uniqueUsers = useMemo(() => {
    if (!allBoardMembers) return [];
    return allBoardMembers.map(m => m.profile);
  }, [allBoardMembers]);

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

  // Filter members based on filters - recalculate time from filtered entries
  const filteredMemberStats = useMemo((): BoardMemberWithTime[] => {
    if (!allBoardMembers) return [];
    
    // If no filters active, return all members with their full time stats
    const hasFilters = searchTerm || userFilter !== "all" || startDate || endDate || deliveryFilter !== "all";
    
    if (!hasFilters) {
      return allBoardMembers;
    }

    // Recalculate stats from filtered entries for each member
    const memberStatsMap = new Map<string, {
      totalSeconds: number;
      isActive: boolean;
      activeStartedAt: string | null;
      demandCount: number;
      deliveredCount: number;
      inProgressCount: number;
      entries: BoardTimeEntry[];
    }>();

    // Initialize all members
    allBoardMembers.forEach(member => {
      memberStatsMap.set(member.userId, {
        totalSeconds: 0,
        isActive: false,
        activeStartedAt: null,
        demandCount: 0,
        deliveredCount: 0,
        inProgressCount: 0,
        entries: [],
      });
    });

    // Calculate from filtered entries
    const userDemandData = new Map<string, { 
      demandIds: Set<string>;
      deliveredIds: Set<string>;
      inProgressIds: Set<string>;
    }>();
    
    for (const entry of filteredEntries) {
      const userId = entry.user_id;
      const stats = memberStatsMap.get(userId);
      const isDelivered = entry.demand.status?.name?.toLowerCase() === "entregue";
      
      if (stats) {
        stats.totalSeconds += entry.duration_seconds || 0;
        stats.entries.push(entry);
        
        if (!entry.ended_at) {
          stats.isActive = true;
          if (!stats.activeStartedAt || new Date(entry.started_at) > new Date(stats.activeStartedAt)) {
            stats.activeStartedAt = entry.started_at;
          }
        }

        if (!userDemandData.has(userId)) {
          userDemandData.set(userId, { 
            demandIds: new Set(), 
            deliveredIds: new Set(), 
            inProgressIds: new Set() 
          });
        }
        const demandData = userDemandData.get(userId)!;
        demandData.demandIds.add(entry.demand_id);
        if (isDelivered) {
          demandData.deliveredIds.add(entry.demand_id);
        } else {
          demandData.inProgressIds.add(entry.demand_id);
        }
      }
    }

    // Update demand counts
    for (const [userId, demandData] of userDemandData) {
      const stats = memberStatsMap.get(userId);
      if (stats) {
        stats.demandCount = demandData.demandIds.size;
        stats.deliveredCount = demandData.deliveredIds.size;
        stats.inProgressCount = demandData.inProgressIds.size;
      }
    }

    // Merge with member data and filter by search if applicable
    let result = allBoardMembers.map(member => {
      const stats = memberStatsMap.get(member.userId)!;
      return {
        ...member,
        ...stats,
      };
    });

    // Filter by user if specific user selected
    if (userFilter !== "all") {
      result = result.filter(m => m.userId === userFilter);
    }

    // Filter by search term on name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m => m.profile.full_name.toLowerCase().includes(term));
    }

    return result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return b.totalSeconds - a.totalSeconds;
    });
  }, [allBoardMembers, filteredEntries, searchTerm, userFilter, startDate, endDate, deliveryFilter]);

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
    
    filteredMemberStats.forEach(member => {
      totalTime += member.totalSeconds;
      if (member.isActive && member.activeStartedAt) {
        if (!earliestActiveStart || new Date(member.activeStartedAt) < new Date(earliestActiveStart)) {
          earliestActiveStart = member.activeStartedAt;
        }
      }
    });
    
    const totalDemands = groupedByDemand.length;
    const totalEntries = filteredEntries.length;
    const activeUsers = filteredMemberStats.length;
    const avgTimePerUser = activeUsers > 0 ? Math.round(totalTime / activeUsers) : 0;
    const avgTimePerDemand = totalDemands > 0 ? Math.round(totalTime / totalDemands) : 0;
    
    const activeTimers = filteredMemberStats.filter(m => m.isActive).length;

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
  }, [filteredMemberStats, groupedByDemand, filteredEntries]);

  // Live timer for total time
  const liveTotalTime = useLiveTimer({
    isActive: totals.activeTimers > 0,
    baseSeconds: totals.totalTime,
    lastStartedAt: totals.earliestActiveStart,
  });

  // Max time for progress calculation
  const maxUserTime = useMemo(() => {
    if (filteredMemberStats.length === 0) return 0;
    return Math.max(...filteredMemberStats.map(m => m.totalSeconds));
  }, [filteredMemberStats]);

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

  const handleClearFilters = () => {
    setSearchTerm("");
    setUserFilter("all");
    setDeliveryFilter("all");
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
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

      const tableData = filteredMemberStats.map(member => [
        member.profile.full_name,
        member.demandCount.toString(),
        member.entries.length.toString(),
        formatTimeDisplay(member.totalSeconds) || "00:00:00:00",
        member.isActive ? "Sim" : "Não"
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

  // ============ ACCESS CONTROL ============
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

      {/* Active Work Section */}
      <ActiveWorkSection activeDemands={activeDemands} />

      {/* Stats Overview Cards */}
      <StatsOverviewCards
        totalTimeSeconds={totals.totalTime}
        liveTimeDisplay={liveTotalTime}
        activeTimersCount={totals.activeTimers}
        totalMembers={allBoardMembers?.length || 0}
        totalDemands={totals.totalDemands}
        totalEntries={totals.totalEntries}
        avgTimePerUser={totals.avgTimePerUser}
        avgTimePerDemand={totals.avgTimePerDemand}
        isLoading={isLoading}
      />

      {/* Performance Charts */}
      {!isLoading && (
        <PerformanceCharts
          members={filteredMemberStats}
          groupedByDemand={groupedByDemand.map(g => ({
            demand: g.demand,
            totalSeconds: g.totalSeconds,
          }))}
          statusDistribution={boardStats.statusDistribution}
          dailyTrend={boardStats.dailyTrend}
        />
      )}

      {/* Member Ranking */}
      {!isLoading && filteredMemberStats.length > 0 && (
        <MemberRanking
          members={filteredMemberStats}
          activeTimersCount={activeTimersCount}
          maxUserTime={maxUserTime}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
        />
      )}

      {/* Filters */}
      <TimeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        userFilter={userFilter}
        onUserFilterChange={setUserFilter}
        deliveryFilter={deliveryFilter}
        onDeliveryFilterChange={setDeliveryFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        uniqueUsers={uniqueUsers}
        onClearFilters={handleClearFilters}
      />

      {/* Detail Tabs */}
      <TimeDetailTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        members={filteredMemberStats}
        groupedByDemand={groupedByDemand}
        expandedUsers={expandedUsers}
        expandedDemands={expandedDemands}
        onToggleUser={toggleUser}
        onToggleDemand={toggleDemand}
        isLoading={isLoading}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
