import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanNotifications } from "@/components/KanbanNotifications";
import { KanbanFilters, KanbanFiltersState } from "@/components/KanbanFilters";
import { KanbanStagesManager } from "@/components/KanbanStagesManager";

import { useDemands } from "@/hooks/useDemands";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useBoard } from "@/hooks/useBoards";
import { useAuth } from "@/lib/auth";
import { useMembersByPosition } from "@/hooks/useMembersByPosition";
import { useIsTeamAdminOrModerator } from "@/hooks/useTeamRole";
import { useKanbanColumns } from "@/hooks/useBoardStatuses";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtimeDemands, useKanbanRealtimeNotifications } from "@/hooks/useRealtimeDemands";
import { isToday, isThisWeek, isPast } from "date-fns";

export default function Kanban() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBoardId, currentTeamId } = useSelectedBoard();
  const { data: demands, isLoading } = useDemands(selectedBoardId || undefined);
  const { data: role } = useBoardRole(selectedBoardId);
  const { data: currentBoard } = useBoard(selectedBoardId);
  const { canManage } = useIsTeamAdminOrModerator(currentTeamId);
  const { columns: kanbanColumns } = useKanbanColumns(selectedBoardId);
  
  const [filters, setFilters] = useState<KanbanFiltersState>({
    myTasks: false,
    priority: null,
    dueDate: null,
    position: null,
  });
  
  // Fetch members with selected position for filtering
  const { data: membersByPosition } = useMembersByPosition(currentTeamId, filters.position);
  
  // Enable realtime updates for demands
  useRealtimeDemands(selectedBoardId || undefined);
  
  // Enable realtime notifications for card moves
  const { 
    notifications, 
    clearNotification, 
    clearAllNotifications 
  } = useKanbanRealtimeNotifications(selectedBoardId || undefined);

  const isReadOnly = role === "requester";

  // Filter demands based on all filters
  const filteredDemands = useMemo(() => {
    if (!demands) return [];
    
    return demands.filter((d) => {
      // My tasks filter
      if (filters.myTasks && user?.id) {
        const isAssigned = d.demand_assignees?.some(
          (a) => a.user_id === user.id
        ) || d.assigned_to === user.id;
        if (!isAssigned) return false;
      }
      
      // Priority filter
      if (filters.priority && d.priority !== filters.priority) {
        return false;
      }
      
      // Due date filter
      if (filters.dueDate && d.due_date) {
        const dueDate = new Date(d.due_date);
        if (filters.dueDate === "overdue" && !isPast(dueDate)) return false;
        if (filters.dueDate === "today" && !isToday(dueDate)) return false;
        if (filters.dueDate === "week" && !isThisWeek(dueDate)) return false;
      } else if (filters.dueDate && !d.due_date) {
        return false;
      }
      
      // Position filter - filter by members with selected position
      if (filters.position && membersByPosition) {
        const hasAssigneeWithPosition = d.demand_assignees?.some(
          (a) => membersByPosition.includes(a.user_id)
        ) || (d.assigned_to && membersByPosition.includes(d.assigned_to));
        if (!hasAssigneeWithPosition) return false;
      }
      
      return true;
    });
  }, [demands, filters, user?.id, membersByPosition]);

  // Count user's demands
  const myDemandsCount = useMemo(() => {
    if (!demands || !user?.id) return 0;
    return demands.filter((d) => {
      const isAssigned = d.demand_assignees?.some(
        (a) => a.user_id === user.id
      ) || d.assigned_to === user.id;
      return isAssigned;
    }).length;
  }, [demands, user?.id]);

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between shrink-0 pb-4 md:pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t("kanban.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isReadOnly ? t("kanban.dragHint") : t("kanban.dragHint")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Kanban Stage Manager - only for admins/moderators */}
          {canManage && selectedBoardId && (
            <KanbanStagesManager boardId={selectedBoardId} />
          )}

          {/* Kanban Filters */}
          <KanbanFilters 
            teamId={currentTeamId} 
            filters={filters} 
            onChange={setFilters} 
          />

          <Button onClick={() => navigate("/demands/create")} className="shadow-primary">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">{t("demands.newDemand").split(" ")[0]}</span>
            <span className="hidden sm:inline">{t("demands.newDemand")}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {!selectedBoardId ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t("teams.title")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("common.noResults")}
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-4">{t("common.loading")}</p>
          </div>
        ) : filteredDemands && filteredDemands.length > 0 ? (
          <KanbanBoard 
            demands={filteredDemands} 
            columns={kanbanColumns}
            onDemandClick={id => navigate(`/demands/${id}`, { state: { from: "kanban" } })} 
            readOnly={isReadOnly}
            userRole={role || undefined}
            boardName={currentBoard?.name}
          />
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {filters.myTasks ? "Nenhuma demanda atribuída a você" : t("demands.noDemands")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {isReadOnly ? t("common.noResults") : t("demands.createFirst")}
            </p>
            {!filters.myTasks && (
              <div className="mt-6">
                <Button onClick={() => navigate("/demands/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("demands.createFirst")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Real-time notifications for card moves */}
      <KanbanNotifications
        notifications={notifications}
        onClear={clearNotification}
        onClearAll={clearAllNotifications}
        onDemandClick={(id) => navigate(`/demands/${id}`, { state: { from: "kanban" } })}
      />
    </div>
  );
}
