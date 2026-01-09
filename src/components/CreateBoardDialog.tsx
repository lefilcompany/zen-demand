import { useState, useEffect } from "react";
import { useCreateBoard } from "@/hooks/useBoards";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useServices } from "@/hooks/useServices";
import { useAddBoardServices } from "@/hooks/useBoardServices";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2, AlertCircle, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateBoardDialogProps {
  trigger?: React.ReactNode;
}

interface SelectedService {
  serviceId: string;
  serviceName: string;
  monthlyLimit: number;
}

export function CreateBoardDialog({ trigger }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [error, setError] = useState("");

  const { selectedTeamId } = useSelectedTeam();
  const createBoard = useCreateBoard();
  const addBoardServices = useAddBoardServices();
  const { data: teamServices, isLoading: servicesLoading } = useServices(selectedTeamId);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedServices([]);
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleServiceToggle = (serviceId: string, serviceName: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [
        ...prev,
        { serviceId, serviceName, monthlyLimit: 0 }
      ]);
    } else {
      setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
    }
  };

  const handleLimitChange = (serviceId: string, limit: number) => {
    setSelectedServices(prev => 
      prev.map(s => s.serviceId === serviceId ? { ...s, monthlyLimit: limit } : s)
    );
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

    if (selectedServices.length === 0) {
      setError("Selecione ao menos um serviço para o quadro");
      return;
    }

    try {
      // Create the board
      const newBoard = await createBoard.mutateAsync({
        team_id: selectedTeamId,
        name: trimmedName,
        description: description.trim() || null,
        monthly_demand_limit: 0, // No longer using global limit
      });

      // Add services to the board
      if (newBoard && selectedServices.length > 0) {
        await addBoardServices.mutateAsync({
          boardId: newBoard.id,
          services: selectedServices.map(s => ({
            serviceId: s.serviceId,
            monthlyLimit: s.monthlyLimit,
          })),
        });
      }

      resetForm();
      setOpen(false);
    } catch (err) {
      console.error("Erro ao criar quadro:", err);
    }
  };

  const isSubmitting = createBoard.isPending || addBoardServices.isPending;
  const hasNoServices = !servicesLoading && (!teamServices || teamServices.length === 0);

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Novo Quadro</DialogTitle>
          <DialogDescription>
            Crie um novo quadro e defina os serviços e limites de demandas.
          </DialogDescription>
        </DialogHeader>

        {hasNoServices ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não há serviços cadastrados nesta equipe. Cadastre serviços antes de criar um quadro.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="board-name">Nome do Quadro *</Label>
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marketing, Desenvolvimento..."
                maxLength={100}
                autoComplete="off"
                disabled={isSubmitting}
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
                rows={2}
                maxLength={500}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Serviços Disponíveis *
              </Label>
              <p className="text-xs text-muted-foreground">
                Selecione os serviços que podem ser solicitados neste quadro e defina o limite mensal para cada um (0 = ilimitado)
              </p>
              
              {servicesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="flex-1 border rounded-md max-h-[200px]">
                  <div className="space-y-3 p-3">
                    {teamServices?.map((service) => {
                      const isSelected = selectedServices.some(s => s.serviceId === service.id);
                      const selectedService = selectedServices.find(s => s.serviceId === service.id);
                      
                      return (
                        <div key={service.id} className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`service-${service.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleServiceToggle(service.id, service.name, checked === true)
                              }
                              disabled={isSubmitting}
                            />
                            <label
                              htmlFor={`service-${service.id}`}
                              className="flex-1 text-sm font-medium cursor-pointer"
                            >
                              {service.name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({service.estimated_hours}h)
                              </span>
                            </label>
                          </div>
                          
                          {isSelected && (
                            <div className="ml-7 flex items-center gap-2">
                              <Label htmlFor={`limit-${service.id}`} className="text-xs whitespace-nowrap">
                                Limite mensal:
                              </Label>
                              <Input
                                id={`limit-${service.id}`}
                                type="number"
                                min={0}
                                value={selectedService?.monthlyLimit || 0}
                                onChange={(e) => handleLimitChange(service.id, parseInt(e.target.value) || 0)}
                                className="h-7 w-20 text-xs"
                                disabled={isSubmitting}
                              />
                              <span className="text-xs text-muted-foreground">
                                {selectedService?.monthlyLimit === 0 ? "(ilimitado)" : "demandas"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              
              {selectedServices.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedServices.length} serviço(s) selecionado(s)
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || hasNoServices}>
                {isSubmitting ? (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
