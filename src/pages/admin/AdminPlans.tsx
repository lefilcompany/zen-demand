import { useState } from "react";
import { useAdminPlans, useCreatePlan, useUpdatePlan, useReorderPlans } from "@/hooks/admin/useAdminPlans";
import type { Plan } from "@/hooks/usePlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, ArrowUp, ArrowDown, CreditCard, Crown, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  billing_period: string;
  max_teams: number;
  max_boards: number;
  max_members: number;
  max_demands_per_month: number;
  max_services: number;
  max_notes: number;
  is_active: boolean;
  sort_order: number;
  features: Record<string, any>;
}

const defaultForm: PlanFormData = {
  name: "",
  slug: "",
  description: "",
  price_cents: 0,
  billing_period: "monthly",
  max_teams: 1,
  max_boards: 1,
  max_members: 3,
  max_demands_per_month: 30,
  max_services: 5,
  max_notes: 0,
  is_active: true,
  sort_order: 0,
  features: {},
};

const featureOptions = [
  { key: "time_tracking", label: "Time Tracking", options: ["basic", "advanced"] },
  { key: "notifications", label: "Notificações", options: ["in_app", "email", "push"] },
  { key: "support", label: "Suporte", options: ["docs", "email", "priority", "dedicated"] },
  { key: "reports", label: "Relatórios", options: ["basic", "advanced"] },
  { key: "share_external", label: "Compartilhamento Externo", type: "boolean" },
  { key: "ai_summary", label: "Resumo IA", type: "boolean" },
  { key: "contracts", label: "Contratos", type: "boolean" },
  { key: "api", label: "API", type: "boolean" },
  { key: "sla", label: "SLA", type: "boolean" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function LimitDisplay({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  if (value === -1) return <Badge variant="secondary" className="text-xs">Ilimitado</Badge>;
  return <span>{value}</span>;
}

export default function AdminPlans() {
  const { data: plans, isLoading } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const reorderPlans = useReorderPlans();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormData>(defaultForm);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({
      ...defaultForm,
      sort_order: (plans?.length ?? 0) + 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price_cents: plan.price_cents,
      billing_period: plan.billing_period,
      max_teams: plan.max_teams ?? 1,
      max_boards: plan.max_boards ?? 1,
      max_members: plan.max_members ?? 3,
      max_demands_per_month: plan.max_demands_per_month ?? 30,
      max_services: plan.max_services ?? 5,
      max_notes: plan.max_notes ?? 0,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      features: plan.features || {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, ...form });
        toast.success("Plano atualizado com sucesso");
      } else {
        await createPlan.mutateAsync(form as any);
        toast.success("Plano criado com sucesso");
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar plano");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!plans) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= plans.length) return;

    const updates = plans.map((p, i) => {
      if (i === index) return { id: p.id, sort_order: plans[swapIndex].sort_order };
      if (i === swapIndex) return { id: p.id, sort_order: plans[index].sort_order };
      return { id: p.id, sort_order: p.sort_order };
    });

    try {
      await reorderPlans.mutateAsync(updates);
      toast.success("Ordem atualizada");
    } catch {
      toast.error("Erro ao reordenar");
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, is_active: !plan.is_active });
      toast.success(plan.is_active ? "Plano desativado" : "Plano ativado");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const updateFeature = (key: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura do sistema</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="text-center">Quadros</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-center">Demandas/mês</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan, index) => (
                  <TableRow key={plan.id} className={!plan.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0 || reorderPlans.isPending}
                          onClick={() => handleMove(index, "up")}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === (plans?.length ?? 0) - 1 || reorderPlans.isPending}
                          onClick={() => handleMove(index, "down")}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="font-medium">{plan.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.slug}</code>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(plan.price_cents)}</TableCell>
                    <TableCell className="text-center"><LimitDisplay value={plan.max_boards} /></TableCell>
                    <TableCell className="text-center"><LimitDisplay value={plan.max_members} /></TableCell>
                    <TableCell className="text-center"><LimitDisplay value={plan.max_demands_per_month} /></TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={() => handleToggleActive(plan)}
                        disabled={updatePlan.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!plans || plans.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum plano cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {editingPlan ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Profissional"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  placeholder="Ex: profissional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição do plano..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (centavos)</Label>
                <Input
                  type="number"
                  value={form.price_cents}
                  onChange={(e) => setForm((f) => ({ ...f, price_cents: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(form.price_cents)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Período de Cobrança</Label>
                <Select value={form.billing_period} onValueChange={(v) => setForm((f) => ({ ...f, billing_period: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Limits */}
            <div>
              <Label className="text-base font-semibold">Limites</Label>
              <p className="text-xs text-muted-foreground mb-3">Use -1 para ilimitado, 0 para desabilitado</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Equipes</Label>
                  <Input type="number" value={form.max_teams} onChange={(e) => setForm((f) => ({ ...f, max_teams: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quadros</Label>
                  <Input type="number" value={form.max_boards} onChange={(e) => setForm((f) => ({ ...f, max_boards: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Membros</Label>
                  <Input type="number" value={form.max_members} onChange={(e) => setForm((f) => ({ ...f, max_members: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Demandas/mês</Label>
                  <Input type="number" value={form.max_demands_per_month} onChange={(e) => setForm((f) => ({ ...f, max_demands_per_month: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Serviços</Label>
                  <Input type="number" value={form.max_services} onChange={(e) => setForm((f) => ({ ...f, max_services: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notas</Label>
                  <Input type="number" value={form.max_notes} onChange={(e) => setForm((f) => ({ ...f, max_notes: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="text-base font-semibold">Funcionalidades</Label>
              <div className="mt-3 space-y-3">
                {featureOptions.map((feat) => (
                  <div key={feat.key} className="flex items-center justify-between">
                    <Label className="text-sm">{feat.label}</Label>
                    {feat.type === "boolean" ? (
                      <Switch
                        checked={!!form.features[feat.key]}
                        onCheckedChange={(v) => updateFeature(feat.key, v)}
                      />
                    ) : (
                      <Select
                        value={form.features[feat.key] || ""}
                        onValueChange={(v) => updateFeature(feat.key, v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Desabilitado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disabled">Desabilitado</SelectItem>
                          {feat.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Plano ativo</Label>
                <p className="text-xs text-muted-foreground">Planos inativos não aparecem para novos usuários</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {createPlan.isPending || updatePlan.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
