import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useDemands } from "@/hooks/useDemands";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Kanban() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands, isLoading } = useDemands(selectedTeamId || undefined);
  const { data: role } = useTeamRole(selectedTeamId);

  const isReadOnly = role === "requester";

  return (
    <div className="flex flex-col h-full animate-fade-in">
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
        {!selectedTeamId ? (
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
            onDemandClick={id => navigate(`/demands/${id}`)} 
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
    </div>
  );
}
