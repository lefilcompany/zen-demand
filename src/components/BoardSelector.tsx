import { useRef } from "react";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { useNavigate, useLocation } from "react-router-dom";
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
import { toast } from "sonner";

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
  requester: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const SKIP_CONFIRM_KEY = "skipBoardChangeConfirm";

export function BoardSelector() {
  const { boards, selectedBoardId, setSelectedBoardId, isLoading, currentBoard } =
    useSelectedBoardSafe();
  const { data: boardRole, isLoading: roleLoading } = useBoardRole(selectedBoardId);
  const navigate = useNavigate();
  const location = useLocation();
  const toastIdRef = useRef<string | number | null>(null);

  const isDemandDetail = /^\/demands\/[^/]+$/.test(location.pathname);

  const getReturnRoute = () => {
    const from = (location.state as any)?.from;
    if (from === "kanban") return "/kanban";
    if (from === "my-demands") return "/my-demands";
    if (from === "team-demands") return "/team-demands";
    if (from === "team-kanban") return "/team-kanban";
    return "/demands";
  };

  const executeChange = (newBoardId: string) => {
    setSelectedBoardId(newBoardId);
    if (isDemandDetail) {
      navigate(getReturnRoute());
    }
  };

  const handleBoardChange = (newBoardId: string) => {
    if (newBoardId === selectedBoardId) return;

    if (!isDemandDetail) {
      setSelectedBoardId(newBoardId);
      return;
    }

    const skipConfirm = localStorage.getItem(SKIP_CONFIRM_KEY) === "true";
    if (skipConfirm) {
      executeChange(newBoardId);
      return;
    }

    // Dismiss previous toast if still open
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    const targetBoard = boards?.find((b) => b.id === newBoardId);

    toastIdRef.current = toast("Mudar de quadro?", {
      description: `Você será redirecionado ao sair desta demanda para o quadro "${targetBoard?.name || "selecionado"}".`,
      duration: 10000,
      action: {
        label: "Mudar",
        onClick: () => {
          executeChange(newBoardId);
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
      onDismiss: () => {
        toastIdRef.current = null;
      },
      onAutoClose: () => {
        toastIdRef.current = null;
      },
    });
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-[180px]" />;
  }

  if (!boards || boards.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
      <Select value={selectedBoardId || ""} onValueChange={handleBoardChange}>
        <SelectTrigger className="max-w-[160px] sm:max-w-[240px] md:max-w-[300px] h-7 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate block">{currentBoard?.name || "Quadro"}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {boards.map((board) => (
            <SelectItem key={board.id} value={board.id}>
              <div className="flex items-center gap-2">
                <span>{board.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {roleLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground hidden sm:block" />
      ) : boardRole ? (
        <Badge variant="outline" className={`${roleColors[boardRole]} text-xs hidden sm:inline-flex`}>
          {roleLabels[boardRole]}
        </Badge>
      ) : null}
    </div>
  );
}
