import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemandCard } from "@/components/DemandCard";
import { useAllTeamDemands } from "@/hooks/useAllTeamDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useMembersByPosition } from "@/hooks/useMembersByPosition";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Layers, LayoutGrid, List, Search, Eye, EyeOff, CalendarDays, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { teamDemandColumns, TeamDemandTableRow } from "@/components/team-demands/columns";
import { TeamDemandsFilters, TeamDemandsFiltersState } from "@/components/TeamDemandsFilters";
import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { DemandsCalendarView } from "@/components/DemandsCalendarView";

type ViewMode = "table" | "grid" | "calendar";

const TABLET_BREAKPOINT = 1024;
const POSITION_FILTER_KEY = "teamDemandsPositionFilter";

export default function TeamDemands() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTeamId } = useSelectedTeam();
  const { data: role, isLoading: isRoleLoading } = useTeamRole(selectedTeamId);
  const isTeamAdminOrModerator = role === "admin" || role === "moderator";
  const { data: demands, isLoading } = useAllTeamDemands(isTeamAdminOrModerator ? selectedTeamId : null);
  
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

  // Count delivered demands
  const deliveredCount = useMemo(() => {
    if (!demands) return 0;
    return demands.filter((d) => d.demand_statuses?.name === "Entregue").length;
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
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
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
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
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
        <DataTable
          columns={teamDemandColumns}
          data={demandList as unknown as TeamDemandTableRow[]}
          onRowClick={(row) => navigate(`/demands/${row.id}`, { state: { from: "team-demands", viewMode: "table" } })}
          defaultSorting={[{ id: "due_date", desc: false }]}
        />
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

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Visão Geral da Equipe
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Todas as demandas de todos os quadros
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-[200px] md:w-[250px]"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <TeamDemandsFilters 
              teamId={selectedTeamId} 
              filters={filters} 
              onChange={setFilters} 
            />
            {/* Toggle hide/show delivered */}
            {deliveredCount > 0 && (
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
                  {hideDelivered ? "Exibir Entregues" : "Ocultar Entregues"}
                </span>
                <span className="bg-primary-foreground text-primary text-xs px-1.5 py-0.5 rounded-full">
                  {deliveredCount}
                </span>
              </Button>
            )}
            {/* View toggle - calendar visible on all devices, table/grid hidden on mobile/tablet */}
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className={`hidden lg:flex ${viewMode === "table" ? "rounded-r-none bg-primary text-primary-foreground" : "rounded-r-none"}`}
                onClick={() => setViewMode("table")}
                title="Visualização em tabela"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className={`hidden lg:flex rounded-none ${viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Visualização em blocos"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="icon"
                className={viewMode === "calendar" ? "lg:rounded-l-none bg-primary text-primary-foreground" : "lg:rounded-l-none"}
                onClick={() => setViewMode("calendar")}
                title="Visualização em calendário"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isRoleLoading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-4">{t("common.loading")}</p>
        </div>
      ) : !isTeamAdminOrModerator ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Acesso Restrito
          </h3>
          <p className="text-muted-foreground mt-2">
            Apenas administradores e moderadores podem acessar esta página
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      ) : !selectedTeamId ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Selecione uma equipe
          </h3>
          <p className="text-muted-foreground mt-2">
            Escolha uma equipe para ver todas as demandas
          </p>
        </div>
      ) : (
        renderDemandList(filteredDemands)
      )}
    </div>
  );
}
