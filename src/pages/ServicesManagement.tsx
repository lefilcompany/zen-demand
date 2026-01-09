import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { formatPrice, parsePriceToCents, centsToDecimal } from "@/lib/priceUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTeams } from "@/hooks/useTeams";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/useServices";
import { useIsTeamAdmin } from "@/hooks/useTeamRole";
import { ArrowLeft, Plus, Clock, Pencil, Trash2, DollarSign } from "lucide-react";

export default function ServicesManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: services, isLoading: servicesLoading } = useServices(id || null);
  const { isAdmin } = useIsTeamAdmin(id || null);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<{
    id: string;
    name: string;
    description: string;
    estimated_hours: number;
    price_cents: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    estimated_hours: 24,
    price: "0,00",
  });

  const team = teams?.find((t) => t.id === id);

  const handleOpenDialog = (service?: typeof editingService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || "",
        estimated_hours: service.estimated_hours,
        price: centsToDecimal(service.price_cents || 0),
      });
    } else {
      setEditingService(null);
      setFormData({ name: "", description: "", estimated_hours: 24, price: "0,00" });
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !id) return;

    const priceCents = parsePriceToCents(formData.price);

    if (editingService) {
      updateService.mutate(
        {
          id: editingService.id,
          team_id: id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          estimated_hours: formData.estimated_hours,
          price_cents: priceCents,
        },
        {
          onSuccess: () => {
            toast.success("Serviço atualizado com sucesso!");
            setDialogOpen(false);
            setEditingService(null);
          },
          onError: (error: any) => {
            toast.error("Erro ao atualizar serviço", {
              description: getErrorMessage(error),
            });
          },
        }
      );
    } else {
      createService.mutate(
        {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          team_id: id,
          estimated_hours: formData.estimated_hours,
          price_cents: priceCents,
        },
        {
          onSuccess: () => {
            toast.success("Serviço criado com sucesso!");
            setDialogOpen(false);
          },
          onError: (error: any) => {
            toast.error("Erro ao criar serviço", {
              description: getErrorMessage(error),
            });
          },
        }
      );
    }
  };

  const handleDelete = (serviceId: string) => {
    if (!id) return;
    deleteService.mutate(
      { id: serviceId, team_id: id },
      {
        onSuccess: () => {
          toast.success("Serviço excluído com sucesso!");
        },
        onError: (error: any) => {
          toast.error("Erro ao excluir serviço", {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  if (teamsLoading || servicesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Equipe não encontrada</h2>
        <Button onClick={() => navigate("/teams")} className="mt-4">
          Voltar para Equipes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/teams/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Serviços</h1>
            <p className="text-muted-foreground">{team.name}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Editar Serviço" : "Novo Serviço"}
              </DialogTitle>
              <DialogDescription>
                {editingService
                  ? "Atualize as informações do serviço"
                  : "Crie um novo serviço com prazo estimado"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Serviço *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Desenvolvimento de Sistema"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição do serviço..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Prazo Estimado (horas) *</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  min={1}
                  value={formData.estimated_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_hours: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  placeholder="0,00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Deixe 0,00 para serviço gratuito
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.name.trim() ||
                  createService.isPending ||
                  updateService.isPending
                }
              >
                {createService.isPending || updateService.isPending
                  ? "Salvando..."
                  : editingService
                  ? "Salvar"
                  : "Criar Serviço"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services List */}
      {services && services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {service.description && (
                      <CardDescription className="line-clamp-2">
                        {service.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleOpenDialog({
                          id: service.id,
                          name: service.name,
                          description: service.description || "",
                          estimated_hours: service.estimated_hours,
                          price_cents: (service as any).price_cents || 0,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o serviço "{service.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(service.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Prazo estimado: {service.estimated_hours} horas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      {formatPrice((service as any).price_cents || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhum serviço cadastrado ainda.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Serviço
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
