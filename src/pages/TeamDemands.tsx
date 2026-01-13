import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemandCard } from "@/components/DemandCard";
import { useAllTeamDemands } from "@/hooks/useAllTeamDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useMembersByPosition } from "@/hooks/useMembersByPosition";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useBoards } from "@/hooks/useBoards";
import { 
  Layers, 
  LayoutGrid, 
  List, 
  Search, 
  Eye, 
  EyeOff, 
  CalendarDays, 
  ShieldAlert,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { teamDemandColumns, TeamDemandTableRow } from "@/components/team-demands/columns";
import { TeamDemandsFilters, TeamDemandsFiltersState } from "@/components/TeamDemandsFilters";
import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { DemandsCalendarView } from "@/components/DemandsCalendarView";
import { isDateOverdue } from "@/lib/dateUtils";

type ViewMode = "table" | "grid" | "calendar";

const TABLET_BREAKPOINT = 1024;
const POSITION_FILTER_KEY = "teamDemandsPositionFilter";

export default function TeamDemands() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTeamId, currentTeam } = useSelectedTeam();
  const { data: role, isLoading: isRoleLoading } = useTeamRole(selectedTeamId);
  const isTeamAdminOrModerator = role === "admin" || role === "moderator";
  const { data: demands, isLoading } = useAllTeamDemands(isTeamAdminOrModerator ? selectedTeamId : null);
  const { data: boards } = useBoards(selectedTeamId);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  // Initialize viewMode from location state or default to "table"
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stateViewMode = (location.state as { viewMode?: ViewMode })?.viewMode;
    return stateViewMode || "table";
  });

  // Initialize position filter from localStorage
  const [filters, setFilters] = useState<TeamDemandsFiltersState>(() => {
    const savedPosition = localStorage.getItem(POSITION_FILTER_KEY);
    return {
      status: null,
      priority: null,
      assignee: null,
      service: null,
      dueDateFrom: null,
      dueDateTo: null,
      position: savedPosition,
      board: null,
    };
  });
  
  const [hideDelivered, setHideDelivered] = useState(false);
  
  // Fetch members with selected position for filtering
  const { data: membersByPosition } = useMembersByPosition(selectedTeamId, filters.position);
  
  // Detect if screen is mobile or tablet (< 1024px)
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsTabletOrSmaller(window.innerWidth < TABLET_BREAKPOINT);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);
  
  // Force grid view on mobile/tablet (screens < 1024px), but allow calendar on all devices
  const effectiveViewMode = isTabletOrSmaller && viewMode !== "calendar" ? "grid" : viewMode;

  // Statistics
  const stats = useMemo(() => {
    if (!demands) return { total: 0, inProgress: 0, delivered: 0, overdue: 0 };
    
    const total = demands.length;
    const inProgress = demands.filter(d => d.demand_statuses?.name === "Fazendo").length;
    const delivered = demands.filter(d => d.demand_statuses?.name === "Entregue").length;
    const overdue = demands.filter(d => {
      if (!d.due_date || d.demand_statuses?.name === "Entregue") return false;
      return isDateOverdue(d.due_date);
    }).length;
    
    return { total, inProgress, delivered, overdue };
  }, [demands]);

  const filteredDemands = useMemo(() => {
    if (!demands) return [];
    
    const filtered = demands.filter((d) => {
      // Hide delivered filter
      if (hideDelivered && d.demand_statuses?.name === "Entregue") {
        return false;
      }
      
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          d.title.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.priority?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status && d.status_id !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority && d.priority !== filters.priority) {
        return false;
      }
      
      // Board filter
      if (filters.board && d.board_id !== filters.board) {
        return false;
      }
      
      // Assignee filter
      if (filters.assignee) {
        const isAssigned = d.demand_assignees?.some(
          (a) => a.user_id === filters.assignee
        ) || d.assigned_to === filters.assignee;
        if (!isAssigned) return false;
      }
      
      // Service filter
      if (filters.service && d.service_id !== filters.service) {
        return false;
      }
      
      // Position filter - filter by members with selected position
      if (filters.position && membersByPosition) {
        const hasAssigneeWithPosition = d.demand_assignees?.some(
          (a) => membersByPosition.includes(a.user_id)
        ) || (d.assigned_to && membersByPosition.includes(d.assigned_to));
        if (!hasAssigneeWithPosition) return false;
      }
      
      // Due date range filter
      if (d.due_date) {
        const dueDate = new Date(d.due_date);
        if (filters.dueDateFrom && isBefore(dueDate, startOfDay(filters.dueDateFrom))) {
          return false;
        }
        if (filters.dueDateTo && isAfter(dueDate, endOfDay(filters.dueDateTo))) {
          return false;
        }
      } else if (filters.dueDateFrom || filters.dueDateTo) {
        return false;
      }
      
      return true;
    });
    
    // Sort by due date: closest to current date first, no due date at the end
    return filtered.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });
  }, [demands, searchQuery, filters, hideDelivered, membersByPosition]);

  const renderDemandList = (demandList: typeof filteredDemands) => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-4">{t("common.loading")}</p>
        </div>
      );
    }

    if (demandList.length === 0 && effectiveViewMode !== "calendar") {
      if (searchQuery) {
        return (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t("common.noResults")}
            </h3>
            <p className="text-muted-foreground mt-2">
              Tente ajustar os filtros ou a busca
            </p>
          </div>
        );
      }
      return (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Nenhuma demanda encontrada
          </h3>
          <p className="text-muted-foreground mt-2">
            Não há demandas nos quadros desta equipe
          </p>
        </div>
      );
    }

    if (effectiveViewMode === "calendar") {
      return (
        <DemandsCalendarView
          demands={demandList}
          onDemandClick={(demandId) => navigate(`/demands/${demandId}`, { state: { from: "team-demands", viewMode: "calendar" } })}
          onDayClick={() => {}}
          isRequester={false}
        />
      );
    }

    if (effectiveViewMode === "table") {
      return (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            <DataTable
              columns={teamDemandColumns}
              data={demandList as unknown as TeamDemandTableRow[]}
              onRowClick={(row) => navigate(`/demands/${row.id}`, { state: { from: "team-demands", viewMode: "table" } })}
              defaultSorting={[{ id: "due_date", desc: false }]}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {demandList.map((demand) => (
          <DemandCard
            key={demand.id}
            demand={demand}
            onClick={() => navigate(`/demands/${demand.id}`, { state: { from: "team-demands", viewMode: "grid" } })}
            showFullDetails
          />
        ))}
      </div>
    );
  };

  // Loading state
  if (isRoleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-4">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isTeamAdminOrModerator) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Acesso Restrito
            </h3>
            <p className="text-muted-foreground mb-6">
              Apenas administradores e moderadores podem acessar a visão geral da equipe.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No team selected
  if (!selectedTeamId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Selecione uma equipe
            </h3>
            <p className="text-muted-foreground">
              Escolha uma equipe para ver todas as demandas
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Visão Geral
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentTeam?.name ? `Equipe ${currentTeam.name}` : "Todas as demandas"} • {boards?.length || 0} quadros
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground truncate">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground truncate">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground truncate">Entregues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 ${stats.overdue > 0 ? "border-destructive/30 bg-destructive/5" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stats.overdue > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-2xl font-bold ${stats.overdue > 0 ? "text-destructive" : "text-foreground"}`}>{stats.overdue}</p>
                <p className="text-xs text-muted-foreground truncate">Atrasadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[220px] md:w-[280px]"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:ml-auto">
              <TeamDemandsFilters 
                teamId={selectedTeamId} 
                filters={filters} 
                onChange={setFilters} 
              />
              
              {/* Toggle hide/show delivered */}
              {stats.delivered > 0 && (
                <Button 
                  variant={hideDelivered ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHideDelivered(!hideDelivered)}
                  className="gap-2"
                >
                  {hideDelivered ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {hideDelivered ? "Exibir" : "Ocultar"} Entregues
                  </span>
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5">
                    {stats.delivered}
                  </Badge>
                </Button>
              )}
              
              {/* View toggle */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`hidden lg:flex rounded-none h-8 w-8 ${viewMode === "table" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Visualização em tabela"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`hidden lg:flex rounded-none h-8 w-8 ${viewMode === "grid" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Visualização em blocos"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-none h-8 w-8 ${viewMode === "calendar" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                  onClick={() => setViewMode("calendar")}
                  title="Visualização em calendário"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Active filters indicator */}
          {filteredDemands.length !== stats.total && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Exibindo <span className="font-medium text-foreground">{filteredDemands.length}</span> de {stats.total} demandas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {renderDemandList(filteredDemands)}
    </div>
  );
}
