import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemandCard } from "@/components/DemandCard";
import { useDemands } from "@/hooks/useDemands";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useAuth } from "@/lib/auth";
import { useMembersByPosition } from "@/hooks/useMembersByPosition";
import { Plus, Briefcase, LayoutGrid, List, Search, Eye, EyeOff, CalendarDays, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { demandColumns, DemandTableRow } from "@/components/demands/columns";
import { DemandFilters, DemandFiltersState } from "@/components/DemandFilters";
import { StatusFilterTabs } from "@/components/StatusFilterTabs";
import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { useRealtimeDemands } from "@/hooks/useRealtimeDemands";
import { DemandsCalendarView } from "@/components/DemandsCalendarView";
import { CreateDemandQuickDialog } from "@/components/CreateDemandQuickDialog";
import { CreateRequestQuickDialog } from "@/components/CreateRequestQuickDialog";
import { useDemandAssignees } from "@/hooks/useDemandAssignees";
type ViewMode = "table" | "grid" | "calendar";
const TABLET_BREAKPOINT = 1024;
export default function Demands() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user
  } = useAuth();
  const {
    selectedBoardId,
    currentTeamId
  } = useSelectedBoard();
  const {
    data: demands,
    isLoading
  } = useDemands(selectedBoardId || undefined);
  const {
    data: role
  } = useBoardRole(selectedBoardId);

  // Enable realtime updates for demands
  useRealtimeDemands(selectedBoardId || undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize viewMode from location state or default to "table"
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stateViewMode = (location.state as {
      viewMode?: ViewMode;
    })?.viewMode;
    return stateViewMode || "table";
  });
  const [filters, setFilters] = useState<DemandFiltersState>({
    status: null,
    priority: null,
    assignee: null,
    service: null,
    dueDateFrom: null,
    dueDateTo: null,
    position: null
  });
  const [hideDelivered, setHideDelivered] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Fetch members with selected position for filtering
  const {
    data: membersByPosition
  } = useMembersByPosition(currentTeamId, filters.position);

  // Calendar quick create dialog
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
  const isReadOnly = role === "requester";

  // Count delivered demands
  const deliveredCount = useMemo(() => {
    if (!demands) return 0;
    return demands.filter(d => d.demand_statuses?.name === "Entregue").length;
  }, [demands]);

  // Count demands assigned to the current user
  const myDemandsCount = useMemo(() => {
    if (!demands || !user?.id) return 0;
    return demands.filter(d => {
      const isAssigned = d.demand_assignees?.some(a => a.user_id === user.id) || d.assigned_to === user.id;
      return isAssigned;
    }).length;
  }, [demands, user?.id]);
  const filteredDemands = useMemo(() => {
    if (!demands) return [];
    const filtered = demands.filter(d => {
      // Show only my demands filter
      if (showOnlyMine && user?.id) {
        const isAssigned = d.demand_assignees?.some(a => a.user_id === user.id) || d.assigned_to === user.id;
        if (!isAssigned) return false;
      }

      // Hide delivered filter
      if (hideDelivered && d.demand_statuses?.name === "Entregue") {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = d.title.toLowerCase().includes(query) || d.description?.toLowerCase().includes(query) || d.priority?.toLowerCase().includes(query);
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

      // Assignee filter
      if (filters.assignee) {
        const isAssigned = d.demand_assignees?.some(a => a.user_id === filters.assignee) || d.assigned_to === filters.assignee;
        if (!isAssigned) return false;
      }

      // Service filter
      if (filters.service && d.service_id !== filters.service) {
        return false;
      }

      // Position filter - filter by members with selected position
      if (filters.position && membersByPosition) {
        const hasAssigneeWithPosition = d.demand_assignees?.some(a => membersByPosition.includes(a.user_id)) || d.assigned_to && membersByPosition.includes(d.assigned_to);
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
        // If filtering by date but demand has no due date, exclude it
        return false;
      }
      return true;
    });

    // Sort by due date: closest to current date first, no due date at the end
    return filtered.sort((a, b) => {
      // If both have no due date, maintain original order
      if (!a.due_date && !b.due_date) return 0;
      // If only a has no due date, put it at the end
      if (!a.due_date) return 1;
      // If only b has no due date, put it at the end
      if (!b.due_date) return -1;

      // Both have due dates - sort by closest to now first
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });
  }, [demands, searchQuery, filters, hideDelivered, showOnlyMine, user?.id, membersByPosition]);

  // Handle calendar day click
  const handleDayClick = (date: Date) => {
    setSelectedDateForCreate(date);
    setIsCreateDialogOpen(true);
  };
  const renderDemandList = (demandList: typeof filteredDemands) => {
    if (isLoading) {
      return <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-4">{t("common.loading")}</p>
        </div>;
    }
    if (demandList.length === 0 && effectiveViewMode !== "calendar") {
      if (searchQuery) {
        return <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t("common.noResults")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("common.search")}
            </p>
          </div>;
      }
      return <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {t("demands.noDemands")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {isReadOnly ? t("common.noResults") : t("demands.createFirst")}
          </p>
          {!isReadOnly && <div className="mt-6">
              <Button onClick={() => navigate("/demands/create")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("demands.createFirst")}
              </Button>
            </div>}
        </div>;
    }
    if (effectiveViewMode === "calendar") {
      return <DemandsCalendarView demands={demandList} onDemandClick={demandId => navigate(`/demands/${demandId}`, {
        state: {
          from: "demands",
          viewMode: "calendar"
        }
      })} onDayClick={handleDayClick} isRequester={isReadOnly} />;
    }
    if (effectiveViewMode === "table") {
      return <DataTable columns={demandColumns} data={demandList as unknown as DemandTableRow[]} onRowClick={row => navigate(`/demands/${row.id}`, {
        state: {
          from: "demands",
          viewMode: "table"
        }
      })} defaultSorting={[{
        id: "board_sequence_number",
        desc: false
      }]} />;
    }
    return <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {demandList.map(demand => <DemandCard key={demand.id} demand={demand} onClick={() => navigate(`/demands/${demand.id}`, {
        state: {
          from: "demands",
          viewMode: "grid"
        }
      })} showFullDetails />)}
      </div>;
  };
  return <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t("demands.title")}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            {isReadOnly ? t("common.view") : t("common.actions")}
          </p>
        </div>

        {/* Search Bar - Full width on mobile */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("common.search")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-full" />
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          {/* First row on mobile: Filters + Toggle buttons */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Filters Button */}
            <DemandFilters boardId={selectedBoardId} filters={filters} onChange={setFilters} />

            {/* Toggle show only my demands - only for non-requesters */}
            {!isReadOnly && myDemandsCount > 0 && (
              <Button 
                variant={showOnlyMine ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowOnlyMine(!showOnlyMine)} 
                className="gap-1.5 h-9 px-2 md:px-3 flex-shrink-0"
              >
                <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden lg:inline text-xs md:text-sm">
                  Minhas Demandas
                </span>
                <span className="bg-primary-foreground text-primary text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded-full font-medium">
                  {myDemandsCount}
                </span>
              </Button>
            )}

            {/* Toggle hide/show delivered */}
            {deliveredCount > 0 && (
              <Button 
                variant={hideDelivered ? "default" : "outline"} 
                size="sm" 
                onClick={() => setHideDelivered(!hideDelivered)} 
                className="gap-1.5 h-9 px-2 md:px-3 flex-shrink-0"
              >
                {hideDelivered ? <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                <span className="hidden lg:inline text-xs md:text-sm">
                  {hideDelivered ? "Exibir Entregues" : "Ocultar Entregues"}
                </span>
                <span className="bg-primary-foreground text-primary text-[10px] md:text-xs px-1 md:px-1.5 py-0.5 rounded-full font-medium">
                  {deliveredCount}
                </span>
              </Button>
            )}
          </div>

          {/* Second group: View toggle + Create Button */}
          <div className="flex items-center gap-2 sm:ml-auto">
            {/* View toggle */}
            <div className="border border-border rounded-md overflow-hidden shrink-0 flex">
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className={`hidden lg:flex h-8 w-8 rounded-none ${viewMode === "table" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setViewMode("table")} title={t("demands.tableView")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className={`hidden lg:flex h-8 w-8 rounded-none ${viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setViewMode("grid")} title={t("demands.gridView")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "calendar" ? "secondary" : "ghost"} size="icon" className={`h-8 w-8 rounded-none ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setViewMode("calendar")} title="Visualização em calendário">
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>

            {/* Create Button */}
            <Button onClick={() => navigate("/demands/create")} className="shadow-primary h-9 px-3 flex-shrink-0" size="sm">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-sm">{t("demands.newDemand")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Status filter tabs - Scrollable horizontally */}
      <div className="w-full overflow-x-auto -mx-1 px-1">
        <div className="min-w-max pb-1">
          <StatusFilterTabs value={filters.status} onChange={status => setFilters({
          ...filters,
          status
        })} />
        </div>
      </div>

      {!selectedBoardId ? <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {t("teams.title")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {t("common.noResults")}
          </p>
        </div> : renderDemandList(filteredDemands)}

      {/* Quick create dialog for calendar - show request dialog for requesters, demand dialog for others */}
      {isReadOnly ? <CreateRequestQuickDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} selectedDate={selectedDateForCreate} /> : <CreateDemandQuickDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} selectedDate={selectedDateForCreate} />}
    </div>;
}