import { useNavigate } from "react-router-dom";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useDemands, useDemandStatuses } from "@/hooks/useDemands";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, LayoutGrid, List } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { DemandCard } from "@/components/DemandCard";
import { DataTable } from "@/components/ui/data-table";
import { demandColumns } from "@/components/demands/columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = "list" | "grid";
const TABLET_BREAKPOINT = 1024;

export default function MyDemands() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBoardId } = useSelectedBoard();
  const { data: demands, isLoading } = useDemands(selectedBoardId || undefined);
  const { data: statuses } = useDemandStatuses();

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < TABLET_BREAKPOINT);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Filter demands where user is assigned
  const myDemands = useMemo(() => {
    if (!demands || !user?.id) return [];
    return demands.filter((d) => {
      const isAssigned = d.demand_assignees?.some(
        (a: any) => a.user_id === user.id
      );
      return isAssigned && !d.archived;
    });
  }, [demands, user?.id]);

  // Apply filters
  const filteredDemands = useMemo(() => {
    let result = myDemands;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((d) => d.status_id === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((d) => d.priority === priorityFilter);
    }

    return result;
  }, [myDemands, searchQuery, statusFilter, priorityFilter]);

  const effectiveViewMode = isSmallScreen ? "grid" : viewMode;

  const handleDemandClick = (demandId: string) => {
    navigate(`/demands/${demandId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Minhas Demandas</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Minhas Demandas</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Demandas atribuídas a você
          </p>
        </div>

        {/* View mode toggle - hidden on mobile/tablet */}
        {!isSmallScreen && (
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar demandas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statuses?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="média">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || priorityFilter !== "all" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
              setSearchQuery("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredDemands.length} demanda(s) encontrada(s)</span>
        {filteredDemands.length !== myDemands.length && (
          <Badge variant="secondary">
            {myDemands.length} total
          </Badge>
        )}
      </div>

      {/* Content */}
      {filteredDemands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              {myDemands.length === 0
                ? "Você ainda não foi atribuído a nenhuma demanda"
                : "Nenhuma demanda encontrada com os filtros aplicados"}
            </p>
          </CardContent>
        </Card>
      ) : effectiveViewMode === "list" ? (
        <DataTable
          columns={demandColumns}
          data={filteredDemands}
          onRowClick={(row) => handleDemandClick(row.id)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDemands.map((demand) => (
            <DemandCard
              key={demand.id}
              demand={demand}
              onClick={() => handleDemandClick(demand.id)}
              showFullDetails
            />
          ))}
        </div>
      )}
    </div>
  );
}
