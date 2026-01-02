import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanNotifications } from "@/components/KanbanNotifications";

import { useDemands } from "@/hooks/useDemands";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtimeDemands, useKanbanRealtimeNotifications } from "@/hooks/useRealtimeDemands";

export default function Kanban() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedBoardId } = useSelectedBoard();
  const { data: demands, isLoading } = useDemands(selectedBoardId || undefined);
  const { data: role } = useBoardRole(selectedBoardId);
  
  // Enable realtime updates for demands
  useRealtimeDemands(selectedBoardId || undefined);
  
  // Enable realtime notifications for card moves
  const { 
    notifications, 
    clearNotification, 
    clearAllNotifications 
  } = useKanbanRealtimeNotifications(selectedBoardId || undefined);

  const isReadOnly = role === "requester";

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

        <Button onClick={() => navigate("/demands/create")} className="shadow-primary w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="sm:hidden">{t("demands.newDemand").split(" ")[0]}</span>
          <span className="hidden sm:inline">{t("demands.newDemand")}</span>
        </Button>
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
        ) : demands && demands.length > 0 ? (
          <KanbanBoard 
            demands={demands} 
            onDemandClick={id => navigate(`/demands/${id}`, { state: { from: "kanban" } })} 
            readOnly={isReadOnly}
            userRole={role || undefined}
          />
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t("demands.noDemands")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {isReadOnly ? t("common.noResults") : t("demands.createFirst")}
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate("/demands/create")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("demands.createFirst")}
              </Button>
            </div>
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
