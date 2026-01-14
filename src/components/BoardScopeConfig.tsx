import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Loader2, Plus, Trash2, Package, AlertCircle, Infinity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useBoard } from "@/hooks/useBoards";
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
  
  // Services hooks
  const { data: boardServicesUsage, isLoading: servicesLoading } = useBoardServicesWithUsage(boardId);
  const { data: teamServices } = useServices(board?.team_id || null);
  const addBoardServices = useAddBoardServices();
  const updateLimit = useUpdateBoardServiceLimit();
  const removeService = useRemoveBoardService();

  const [selectedNewService, setSelectedNewService] = useState<string>("");
  const [newServiceLimit, setNewServiceLimit] = useState<number>(0);
  const [editingLimits, setEditingLimits] = useState<Record<string, number>>({});

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
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Serviços e Limites</CardTitle>
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
    <Card className="col-span-full">
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
            {/* Current Services - Grid Layout */}
            {boardServicesUsage && boardServicesUsage.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {boardServicesUsage.map((bs) => {
                  const progressPercent = bs.monthly_limit > 0 
                    ? Math.min(100, (bs.currentCount / bs.monthly_limit) * 100)
                    : 0;
                  
                  return (
                    <div 
                      key={bs.id} 
                      className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow relative group"
                    >
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveService(bs.id)}
                          disabled={removeService.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm line-clamp-1">{bs.service?.name}</h4>
                          <span className="text-xs text-muted-foreground">
                            {bs.service?.estimated_hours}h estimadas
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {bs.monthly_limit > 0 ? (
                            <>
                              <Progress value={progressPercent} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {bs.currentCount}/{bs.monthly_limit} demandas
                                {bs.isLimitReached && (
                                  <span className="text-destructive font-medium ml-1">(LIMITE)</span>
                                )}
                              </p>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Infinity className="h-3 w-3" />
                              <span>{bs.currentCount} demandas (ilimitado)</span>
                            </div>
                          )}
                        </div>
                        
                        {canEdit && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Label className="text-xs whitespace-nowrap text-muted-foreground">Limite:</Label>
                            <Input
                              type="number"
                              min={0}
                              value={editingLimits[bs.id] ?? bs.monthly_limit}
                              onChange={(e) => setEditingLimits(prev => ({
                                ...prev,
                                [bs.id]: parseInt(e.target.value) || 0
                              }))}
                              className="h-7 flex-1 text-xs"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={selectedNewService} onValueChange={setSelectedNewService}>
                      <SelectTrigger className="flex-1 min-w-[200px]">
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
  );
}
