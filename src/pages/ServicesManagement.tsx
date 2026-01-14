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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTeams } from "@/hooks/useTeams";
import { 
  useHierarchicalServices, 
  usePotentialParentServices,
  useCreateService, 
  useUpdateService, 
  useDeleteService,
  ServiceWithHierarchy
} from "@/hooks/useServices";
import { useIsTeamAdmin } from "@/hooks/useTeamRole";
import { ArrowLeft, Plus, Clock, Pencil, Trash2, DollarSign, Folder, ChevronDown, ChevronRight } from "lucide-react";

export default function ServicesManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: hierarchicalServices, isLoading: servicesLoading } = useHierarchicalServices(id || null);
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
    parent_id: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    estimated_hours: 24,
    price: "0,00",
    parent_id: null as string | null,
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: potentialParents } = usePotentialParentServices(id || null, editingService?.id);

  const team = teams?.find((t) => t.id === id);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleOpenDialog = (service?: typeof editingService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || "",
        estimated_hours: service.estimated_hours,
        price: centsToDecimal(service.price_cents || 0),
        parent_id: service.parent_id,
      });
    } else {
      setEditingService(null);
      setFormData({ name: "", description: "", estimated_hours: 24, price: "0,00", parent_id: null });
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
          parent_id: formData.parent_id,
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
          parent_id: formData.parent_id,
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

  const renderServiceCard = (service: ServiceWithHierarchy, isChild: boolean = false) => (
    <Card key={service.id} className={`${isChild ? "border-l-4 border-l-primary/30" : ""} h-full`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {service.isCategory && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Folder className="h-3 w-3 mr-1" />
                  Categoria
                </Badge>
              )}
              <CardTitle className="text-base truncate">{service.name}</CardTitle>
            </div>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                handleOpenDialog({
                  id: service.id,
                  name: service.name,
                  description: service.description || "",
                  estimated_hours: service.estimated_hours,
                  price_cents: service.price_cents || 0,
                  parent_id: service.parent_id,
                })
              }
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o serviço "{service.name}"? 
                      {service.isCategory && service.children.length > 0 && (
                        <span className="block mt-2 text-destructive font-medium">
                          Atenção: Este serviço é uma categoria com {service.children.length} subserviço(s). 
                          Os subserviços ficarão órfãos.
                        </span>
                      )}
                      Esta ação não pode ser desfeita.
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
      <CardContent className="pt-0 pb-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{service.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {formatPrice(service.price_cents || 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
                  : "Crie um novo serviço ou subserviço"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent_id">Agrupar em</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parent_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Serviço independente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Serviço independente</SelectItem>
                    {potentialParents?.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          {parent.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Agrupe serviços relacionados para melhor organização. Serviços agrupados aparecem dentro da categoria selecionada.
                </p>
              </div>
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
      {hierarchicalServices && hierarchicalServices.length > 0 ? (
        <div className="space-y-6">
          {/* Categories */}
          {hierarchicalServices.filter(s => s.isCategory).map((category) => (
            <Collapsible
              key={category.id}
              open={expandedCategories.has(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <div className="space-y-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 py-1">
                    {expandedCategories.has(category.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Folder className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold">{category.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {category.children.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pl-6">
                    {category.children.map((child) => renderServiceCard(child, true))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          {/* Standalone services (without category) */}
          {hierarchicalServices.filter(s => !s.isCategory).length > 0 && (
            <div className="space-y-3">
              {hierarchicalServices.filter(s => s.isCategory).length > 0 && (
                <h3 className="text-base font-semibold text-muted-foreground">Serviços independentes</h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {hierarchicalServices.filter(s => !s.isCategory).map((service) => renderServiceCard(service))}
              </div>
            </div>
          )}
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
