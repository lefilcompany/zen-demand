import { useState } from "react";
import { useBoards, Board } from "@/hooks/useBoards";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kanban, AlertTriangle } from "lucide-react";

interface ChangeBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBoardId: string;
  currentBoardName: string;
  teamId: string;
  onConfirm: (newBoardId: string) => void;
  isPending?: boolean;
}

export function ChangeBoardDialog({
  open,
  onOpenChange,
  currentBoardId,
  currentBoardName,
  teamId,
  onConfirm,
  isPending,
}: ChangeBoardDialogProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const { data: boards, isLoading } = useBoards(teamId);

  // Filter out the current board
  const availableBoards = boards?.filter((b) => b.id !== currentBoardId) || [];

  const selectedBoard = availableBoards.find((b) => b.id === selectedBoardId);

  const handleConfirm = () => {
    if (selectedBoardId) {
      onConfirm(selectedBoardId);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedBoardId("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Kanban className="h-5 w-5" />
            Trocar Quadro
          </DialogTitle>
          <DialogDescription>
            Mova esta demanda para outro quadro ao qual você tem acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Board */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Quadro atual
            </label>
            <Badge variant="outline" className="gap-1 text-sm py-1.5 px-3">
              <Kanban className="h-3 w-3" />
              {currentBoardName}
            </Badge>
          </div>

          {/* New Board Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Novo quadro <span className="text-destructive">*</span>
            </label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando quadros...</div>
            ) : availableBoards.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Você não tem acesso a outros quadros.
              </div>
            ) : (
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um quadro" />
                </SelectTrigger>
                <SelectContent>
                  {availableBoards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      <div className="flex items-center gap-2">
                        <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
                        {board.name}
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
            )}
          </div>

          {/* Warning */}
          {selectedBoard && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-warning-foreground">
                    Atenção
                  </p>
                  <p className="text-muted-foreground mt-1">
                    A demanda será movida para <strong>{selectedBoard.name}</strong>. 
                    Usuários que não têm acesso a esse quadro não poderão mais ver esta demanda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBoardId || isPending}
          >
            {isPending ? "Movendo..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
