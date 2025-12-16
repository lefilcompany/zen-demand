import { useState } from "react";
import { useCreateBoard } from "@/hooks/useBoards";
import { useSelectedTeam } from "@/contexts/TeamContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface CreateBoardDialogProps {
  trigger?: React.ReactNode;
}

export function CreateBoardDialog({ trigger }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("0");
  const [error, setError] = useState("");

  const { selectedTeamId } = useSelectedTeam();
  const createBoard = useCreateBoard();

  const resetForm = () => {
    setName("");
    setDescription("");
    setMonthlyLimit("0");
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Nome do quadro é obrigatório");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Nome deve ter no máximo 100 caracteres");
      return;
    }

    if (!selectedTeamId) {
      setError("Nenhuma equipe selecionada");
      return;
    }

    const limitNumber = parseInt(monthlyLimit, 10);
    if (isNaN(limitNumber) || limitNumber < 0) {
      setError("Limite mensal deve ser um número válido");
      return;
    }

    try {
      await createBoard.mutateAsync({
        team_id: selectedTeamId,
        name: trimmedName,
        description: description.trim() || null,
        monthly_demand_limit: limitNumber,
      });

      resetForm();
      setOpen(false);
    } catch (err) {
      // Error is already handled by the hook with toast
      console.error("Erro ao criar quadro:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Quadro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Quadro</DialogTitle>
          <DialogDescription>
            Crie um novo quadro para organizar suas demandas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-name">Nome do Quadro *</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marketing, Desenvolvimento..."
              maxLength={100}
              autoComplete="off"
              disabled={createBoard.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-description">Descrição</Label>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste quadro..."
              className="resize-none"
              rows={3}
              maxLength={500}
              disabled={createBoard.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-limit">Limite Mensal de Demandas</Label>
            <Input
              id="board-limit"
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              min={0}
              placeholder="0 = ilimitado"
              disabled={createBoard.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Deixe 0 para demandas ilimitadas
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createBoard.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createBoard.isPending}>
              {createBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Quadro"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
