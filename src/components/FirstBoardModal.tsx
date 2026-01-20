import { useState, useEffect } from "react";
import { useCreateBoard } from "@/hooks/useBoards";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useServices } from "@/hooks/useServices";
import { useSelectedBoard } from "@/contexts/BoardContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, Package, LayoutGrid } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface SelectedService {
  serviceId: string;
  serviceName: string;
  monthlyLimit: number;
}

export function FirstBoardModal() {
  const navigate = useNavigate();
  const { selectedTeamId, hasTeams, isLoading: teamsLoading } = useSelectedTeam();
  const { hasBoards, isLoading: boardsLoading } = useSelectedBoard();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [error, setError] = useState("");

  const createBoard = useCreateBoard();
  const { data: teamServices, isLoading: servicesLoading } = useServices(selectedTeamId);

  // Determine if modal should be shown
  const isLoading = teamsLoading || boardsLoading;
  const shouldShowModal = !isLoading && hasTeams && !hasBoards;

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedServices([]);
    setError("");
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
      await createBoard.mutateAsync({
        team_id: selectedTeamId,
        name: trimmedName,
        description: description.trim() || null,
        services: selectedServices.map(s => ({
          service_id: s.serviceId,
          monthly_limit: s.monthlyLimit,
        })),
      });

      resetForm();
    } catch (err) {
      console.error("Erro ao criar quadro:", err);
    }
  };

  const handleNavigateToServices = () => {
    navigate("/services");
  };

  const isSubmitting = createBoard.isPending;
  const hasNoServices = !servicesLoading && (!teamServices || teamServices.length === 0);

  if (!shouldShowModal) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Crie seu primeiro quadro</DialogTitle>
              <DialogDescription>
                Quadros organizam suas demandas. Crie um para começar a trabalhar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasNoServices ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Antes de criar um quadro, você precisa cadastrar pelo menos um serviço para sua equipe.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleNavigateToServices} className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Cadastrar Serviços
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="space-y-2 shrink-0">
              <Label htmlFor="first-board-name">Nome do Quadro *</Label>
              <Input
                id="first-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marketing, Desenvolvimento..."
                maxLength={100}
                autoComplete="off"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-2 shrink-0">
              <Label htmlFor="first-board-description">Descrição</Label>
              <Textarea
                id="first-board-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste quadro..."
                className="resize-none"
                rows={2}
                maxLength={500}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <Label className="flex items-center gap-2 shrink-0">
                <Package className="h-4 w-4" />
                Serviços Disponíveis *
              </Label>
              <p className="text-xs text-muted-foreground shrink-0">
                Selecione os serviços que podem ser solicitados neste quadro
              </p>
              
              {servicesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="border rounded-md flex-1 min-h-[120px] max-h-[200px] overflow-y-auto overscroll-contain">
                  <div className="space-y-3 p-3">
                    {teamServices?.map((service) => {
                      const isSelected = selectedServices.some(s => s.serviceId === service.id);
                      const selectedService = selectedServices.find(s => s.serviceId === service.id);
                      
                      return (
                        <div key={service.id} className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`first-service-${service.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleServiceToggle(service.id, service.name, checked === true)
                              }
                              disabled={isSubmitting}
                            />
                            <label
                              htmlFor={`first-service-${service.id}`}
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
                              <Label htmlFor={`first-limit-${service.id}`} className="text-xs whitespace-nowrap">
                                Limite mensal:
                              </Label>
                              <Input
                                id={`first-limit-${service.id}`}
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
                </div>
              )}
              
              {selectedServices.length > 0 && (
                <p className="text-xs text-muted-foreground shrink-0">
                  {selectedServices.length} serviço(s) selecionado(s)
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || hasNoServices} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando quadro...
                  </>
                ) : (
                  <>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Criar Quadro
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
