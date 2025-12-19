import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBoard, useUpdateBoard } from "@/hooks/useBoards";
import { toast } from "sonner";

interface BoardScopeConfigProps {
  boardId: string;
  canEdit?: boolean;
}

export function BoardScopeConfig({ boardId, canEdit = false }: BoardScopeConfigProps) {
  const { t } = useTranslation();
  const { data: board, isLoading } = useBoard(boardId);
  const updateBoard = useUpdateBoard();

  const [monthlyLimit, setMonthlyLimit] = useState<number>(0);
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (board) {
      setMonthlyLimit(board.monthly_demand_limit || 0);
      setDescription(board.description || "");
    }
  }, [board]);

  const handleSave = async () => {
    try {
      await updateBoard.mutateAsync({
        id: boardId,
        monthly_demand_limit: monthlyLimit,
        description: description || null,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Escopo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Escopo</CardTitle>
        <CardDescription>
          Defina o limite de demandas e descrição do quadro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthly-limit">Limite Mensal de Demandas</Label>
          <Input
            id="monthly-limit"
            type="number"
            min={0}
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(parseInt(e.target.value) || 0)}
            disabled={!canEdit}
            placeholder="0 = Ilimitado"
          />
          <p className="text-xs text-muted-foreground">
            Deixe 0 para não ter limite mensal de demandas
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição do Quadro</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            placeholder="Descreva o objetivo deste quadro..."
            rows={3}
          />
        </div>

        {canEdit && (
          <Button 
            onClick={handleSave} 
            disabled={updateBoard.isPending}
            className="w-full"
          >
            {updateBoard.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
