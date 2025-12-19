import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemandCard } from "@/components/DemandCard";
import { DashboardBanner } from "@/components/DashboardBanner";
import { useDemands } from "@/hooks/useDemands";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useAuth } from "@/lib/auth";
import { Plus, Briefcase, LayoutGrid, List, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { demandColumns, DemandTableRow } from "@/components/demands/columns";
import { DemandFilters, DemandFiltersState } from "@/components/DemandFilters";
import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

type ViewMode = "table" | "grid";

const TABLET_BREAKPOINT = 1024;

export default function Demands() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBoardId } = useSelectedBoard();
  const { data: demands, isLoading } = useDemands(selectedBoardId || undefined);
  const { data: role } = useBoardRole(selectedBoardId);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<DemandFiltersState>({
    status: null,
    priority: null,
    assignee: null,
    service: null,
    dueDateFrom: null,
    dueDateTo: null,
  });
  
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
  
  // Force grid view on mobile/tablet (screens < 1024px)
  const effectiveViewMode = isTabletOrSmaller ? "grid" : viewMode;

  const isReadOnly = role === "requester";
  
  const filteredDemands = useMemo(() => {
    if (!demands) return [];
    
    const filtered = demands.filter((d) => {
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
  }, [demands, searchQuery, filters]);
  
  const myDemands = filteredDemands.filter((d) => d.assigned_to === user?.id);
  const createdByMe = filteredDemands.filter((d) => d.created_by === user?.id);

  const renderDemandList = (demandList: typeof filteredDemands) => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-4">{t("common.loading")}</p>
        </div>
      );
    }

    if (demandList.length === 0) {
      if (searchQuery) {
        return (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t("common.noResults")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("common.search")}
            </p>
          </div>
        );
      }
      return (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {t("demands.noDemands")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {isReadOnly ? t("common.noResults") : t("demands.createFirst")}
          </p>
          {!isReadOnly && (
            <div className="mt-6">
              <Button onClick={() => navigate("/demands/create")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("demands.createFirst")}
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (effectiveViewMode === "table") {
      return (
        <DataTable
          columns={demandColumns}
          data={demandList as unknown as DemandTableRow[]}
          onRowClick={(row) => navigate(`/demands/${row.id}`)}
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demandList.map((demand) => (
          <DemandCard
            key={demand.id}
            demand={demand}
            onClick={() => navigate(`/demands/${demand.id}`)}
            showFullDetails
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <DashboardBanner 
        title="Todas as Demandas" 
        subtitle="Visualize e gerencie todas as demandas do seu quadro"
      />
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t("demands.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isReadOnly ? t("common.view") : t("common.actions")}
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
            <DemandFilters 
              boardId={selectedBoardId} 
              filters={filters} 
              onChange={setFilters} 
            />
            {/* View toggle - hidden on mobile/tablet */}
            <div className="hidden lg:flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className={viewMode === "table" ? "rounded-r-none bg-primary text-primary-foreground" : "rounded-r-none"}
                onClick={() => setViewMode("table")}
                title={t("demands.tableView")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className={viewMode === "grid" ? "rounded-l-none bg-primary text-primary-foreground" : "rounded-l-none"}
                onClick={() => setViewMode("grid")}
                title={t("demands.gridView")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => navigate("/demands/create")} className="shadow-primary flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("demands.newDemand")}</span>
              <span className="sm:hidden">{t("demands.newDemand").split(" ")[0]}</span>
            </Button>
          </div>
        </div>
      </div>

      {!selectedBoardId ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {t("teams.title")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {t("common.noResults")}
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm">{t("common.all")}</TabsTrigger>
            <TabsTrigger value="mine" className="text-xs sm:text-sm">{t("demands.assignees")}</TabsTrigger>
            <TabsTrigger value="created" className="text-xs sm:text-sm">{t("demands.createdAt")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {renderDemandList(filteredDemands)}
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            {renderDemandList(myDemands)}
          </TabsContent>

          <TabsContent value="created" className="space-y-4">
            {renderDemandList(createdByMe)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
