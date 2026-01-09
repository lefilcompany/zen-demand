import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Users, Settings2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useBoards } from "@/hooks/useBoards";
import { useBoardMembers, useBoardRole } from "@/hooks/useBoardMembers";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { CreateBoardDialog } from "@/components/CreateBoardDialog";

function BoardCard({ board }: { board: { id: string; name: string; description: string | null; is_default: boolean; monthly_demand_limit: number } }) {
  const navigate = useNavigate();
  const { data: members, isLoading: membersLoading } = useBoardMembers(board.id);
  const { data: role } = useBoardRole(board.id);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    moderator: "Coordenador",
    executor: "Agente",
    requester: "Solicitante",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    executor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    requester: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 min-w-0"
      onClick={() => navigate(`/boards/${board.id}`)}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <LayoutGrid className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold truncate">{board.name}</CardTitle>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {board.is_default && (
            <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
          )}
          {role && (
            <Badge className={`text-xs shrink-0 pointer-events-none ${roleColors[role] || ""}`}>
              {roleLabels[role] || role}
            </Badge>
          )}
        </div>
        {board.description && (
          <CardDescription className="line-clamp-2 text-sm">{board.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {membersLoading ? (
                <Skeleton className="h-4 w-8 inline-block" />
              ) : (
                `${members?.length || 0} membros`
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{board.monthly_demand_limit || "Ilimitado"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Boards() {
  const { t } = useTranslation();
  const { selectedTeamId } = useSelectedTeam();
  const { data: boards, isLoading } = useBoards(selectedTeamId);
  const { data: teamRole } = useTeamRole(selectedTeamId);
  
  const canCreateBoard = teamRole === "admin";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <PageBreadcrumb
        items={[
          { label: "Quadros", icon: LayoutGrid, isCurrent: true },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Meus Quadros</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie os quadros da sua equipe
          </p>
        </div>
        {canCreateBoard && (
          <CreateBoardDialog 
            trigger={
              <Button className="hidden sm:inline-flex w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Quadro
              </Button>
            }
          />
        )}
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum quadro encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Você ainda não tem acesso a nenhum quadro.
          </p>
          {canCreateBoard && (
            <CreateBoardDialog 
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Quadro
                </Button>
              }
            />
          )}
        </Card>
      )}
    </div>
  );
}
