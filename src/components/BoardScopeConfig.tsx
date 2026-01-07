import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Loader2, Plus, Trash2, Package, AlertCircle, Infinity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useBoard, useUpdateBoard } from "@/hooks/useBoards";
import { useServices } from "@/hooks/useServices";
import { 
  useBoardServicesWithUsage, 
  useAddBoardServices, 
  useUpdateBoardServiceLimit, 
  useRemoveBoardService 
} from "@/hooks/useBoardServices";
import { toast } from "sonner";

interface BoardScopeConfigProps {
  boardId: string;
  canEdit?: boolean;
}

export function BoardScopeConfig({ boardId, canEdit = false }: BoardScopeConfigProps) {
  const { t } = useTranslation();
  const { data: board, isLoading } = useBoard(boardId);
  const updateBoard = useUpdateBoard();
  
  // Services hooks
  const { data: boardServicesUsage, isLoading: servicesLoading } = useBoardServicesWithUsage(boardId);
  const { data: teamServices } = useServices(board?.team_id || null);
  const addBoardServices = useAddBoardServices();
  const updateLimit = useUpdateBoardServiceLimit();
  const removeService = useRemoveBoardService();

  const [description, setDescription] = useState<string>("");
  const [selectedNewService, setSelectedNewService] = useState<string>("");
  const [newServiceLimit, setNewServiceLimit] = useState<number>(0);
  const [editingLimits, setEditingLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    if (board) {
      setDescription(board.description || "");
    }
  }, [board]);

  // Initialize editing limits when services load
  useEffect(() => {
    if (boardServicesUsage) {
      const limits: Record<string, number> = {};
      boardServicesUsage.forEach(bs => {
        limits[bs.id] = bs.monthly_limit;
      });
      setEditingLimits(limits);
    }
  }, [boardServicesUsage]);

  const handleSaveDescription = async () => {
    try {
      await updateBoard.mutateAsync({
        id: boardId,
        description: description || null,
      });
      toast.success("Descrição salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar descrição");
    }
  };

  const handleAddService = async () => {
    if (!selectedNewService) return;
    
    try {
      await addBoardServices.mutateAsync({
        boardId,
        services: [{ serviceId: selectedNewService, monthlyLimit: newServiceLimit }],
      });
      setSelectedNewService("");
      setNewServiceLimit(0);
      toast.success("Serviço adicionado ao quadro");
    } catch (error) {
      toast.error("Erro ao adicionar serviço");
    }
  };

  const handleUpdateLimit = async (id: string, newLimit: number) => {
    try {
      await updateLimit.mutateAsync({
        id,
        monthlyLimit: newLimit,
        boardId,
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleRemoveService = async (id: string) => {
    try {
      await removeService.mutateAsync({ id, boardId });
    } catch (error) {
      // Error handled by hook
    }
  };

  // Get services not yet added to the board
  const availableServices = teamServices?.filter(
    ts => !boardServicesUsage?.some(bs => bs.service_id === ts.id)
  ) || [];

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
    <div className="space-y-4">
      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle>Descrição do Quadro</CardTitle>
          <CardDescription>
            Descreva o objetivo e propósito deste quadro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
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
              onClick={handleSaveDescription} 
              disabled={updateBoard.isPending}
              size="sm"
            >
              {updateBoard.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Descrição
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Services & Limits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Serviços e Limites
          </CardTitle>
          <CardDescription>
            Gerencie os serviços disponíveis neste quadro e seus limites mensais de demandas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {servicesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current Services */}
              {boardServicesUsage && boardServicesUsage.length > 0 ? (
                <div className="space-y-3">
                  {boardServicesUsage.map((bs) => {
                    const progressPercent = bs.monthly_limit > 0 
                      ? Math.min(100, (bs.currentCount / bs.monthly_limit) * 100)
                      : 0;
                    
                    return (
                      <div key={bs.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bs.service?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({bs.service?.estimated_hours}h)
                            </span>
                          </div>
                          
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveService(bs.id)}
                              disabled={removeService.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            {bs.monthly_limit > 0 ? (
                              <>
                                <Progress value={progressPercent} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {bs.currentCount} de {bs.monthly_limit} demandas este mês
                                  {bs.isLimitReached && (
                                    <span className="text-destructive font-medium ml-1">(LIMITE ATINGIDO)</span>
                                  )}
                                </p>
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Infinity className="h-3 w-3" />
                                <span>{bs.currentCount} demandas este mês (ilimitado)</span>
                              </div>
                            )}
                          </div>
                          
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">Limite:</Label>
                              <Input
                                type="number"
                                min={0}
                                value={editingLimits[bs.id] ?? bs.monthly_limit}
                                onChange={(e) => setEditingLimits(prev => ({
                                  ...prev,
                                  [bs.id]: parseInt(e.target.value) || 0
                                }))}
                                className="h-7 w-16 text-xs"
                              />
                              {editingLimits[bs.id] !== bs.monthly_limit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => handleUpdateLimit(bs.id, editingLimits[bs.id])}
                                  disabled={updateLimit.isPending}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum serviço configurado para este quadro. Adicione serviços para controlar os limites de demandas.
                  </AlertDescription>
                </Alert>
              )}

              {/* Add New Service */}
              {canEdit && availableServices.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Adicionar Serviço</Label>
                    <div className="flex items-center gap-2">
                      <Select value={selectedNewService} onValueChange={setSelectedNewService}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableServices.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} ({service.estimated_hours}h)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center gap-1">
                        <Label className="text-xs whitespace-nowrap">Limite:</Label>
                        <Input
                          type="number"
                          min={0}
                          value={newServiceLimit}
                          onChange={(e) => setNewServiceLimit(parseInt(e.target.value) || 0)}
                          className="h-9 w-16 text-sm"
                          placeholder="0"
                        />
                      </div>
                      
                      <Button
                        onClick={handleAddService}
                        disabled={!selectedNewService || addBoardServices.isPending}
                        size="sm"
                      >
                        {addBoardServices.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Limite 0 significa demandas ilimitadas para este serviço
                    </p>
                  </div>
                </>
              )}

              {canEdit && availableServices.length === 0 && teamServices && teamServices.length > 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Todos os serviços da equipe já foram adicionados a este quadro
                </p>
              )}

              {!teamServices || teamServices.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Não há serviços cadastrados na equipe. Cadastre serviços na página de gerenciamento de serviços.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
