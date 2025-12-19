import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  moderator: "Coordenador",
  executor: "Agente",
  requester: "Solicitante",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  moderator: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  executor: "bg-green-500/10 text-green-500 border-green-500/20",
  requester: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export function BoardSelector() {
  const { boards, selectedBoardId, setSelectedBoardId, isLoading, currentBoard } =
    useSelectedBoard();
  const { data: boardRole, isLoading: roleLoading } = useBoardRole(selectedBoardId);

  const isRequester = boardRole === "requester";

  if (isLoading) {
    return <Skeleton className="h-9 w-[180px]" />;
  }

  if (!boards || boards.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
      <Select value={selectedBoardId || ""} onValueChange={setSelectedBoardId}>
        <SelectTrigger className="w-[100px] xs:w-[120px] sm:w-[160px] md:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Quadro" className="truncate">
              <span className="truncate">{currentBoard?.name || "Quadro"}</span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {boards.map((board) => (
            <SelectItem key={board.id} value={board.id}>
              <div className="flex items-center gap-2">
                <span>{board.name}</span>
                {board.is_default && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Padrão
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Hide role badge on mobile, only show for non-requesters */}
      {!isRequester && (
        roleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground hidden sm:block" />
        ) : boardRole ? (
          <Badge variant="outline" className={`${roleColors[boardRole]} text-xs hidden sm:inline-flex`}>
            {roleLabels[boardRole]}
          </Badge>
        ) : null
      )}
    </div>
  );
}
