import { useState, useRef } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  requester: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const SKIP_CONFIRM_KEY = "skipBoardChangeConfirm";

export function BoardSelector() {
  const { boards, selectedBoardId, setSelectedBoardId, isLoading, currentBoard } =
    useSelectedBoardSafe();
  const { data: boardRole, isLoading: roleLoading } = useBoardRole(selectedBoardId);
  const navigate = useNavigate();
  const location = useLocation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const pendingBoardIdRef = useRef<string | null>(null);

  const isDemandDetail = /^\/demands\/[^/]+$/.test(location.pathname);

  // Determine where user came from to navigate back appropriately
  const getReturnRoute = () => {
    const from = location.state?.from;
    if (from === "kanban") return "/kanban";
    if (from === "demands") return "/demands";
    if (from === "my-demands") return "/my-demands";
    // Default to demands list
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

    if (isDemandDetail) {
      const skipConfirm = localStorage.getItem(SKIP_CONFIRM_KEY) === "true";
      if (skipConfirm) {
        executeChange(newBoardId);
      } else {
        pendingBoardIdRef.current = newBoardId;
        setDontAskAgain(false);
        setConfirmOpen(true);
      }
    } else {
      setSelectedBoardId(newBoardId);
    }
  };

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem(SKIP_CONFIRM_KEY, "true");
    }
    if (pendingBoardIdRef.current) {
      executeChange(pendingBoardIdRef.current);
      pendingBoardIdRef.current = null;
    }
    setConfirmOpen(false);
  };

  const handleCancel = () => {
    pendingBoardIdRef.current = null;
    setConfirmOpen(false);
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

      {/* Role badge */}
      {roleLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground hidden sm:block" />
      ) : boardRole ? (
        <Badge variant="outline" className={`${roleColors[boardRole]} text-xs hidden sm:inline-flex`}>
          {roleLabels[boardRole]}
        </Badge>
      ) : null}

      {/* Confirmation dialog for board change on demand detail */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mudar de quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está visualizando uma demanda. Ao mudar de quadro, será redirecionado para a tela anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="dontAskAgain"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <label htmlFor="dontAskAgain" className="text-sm text-muted-foreground cursor-pointer">
              Não perguntar novamente
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Mudar quadro</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
