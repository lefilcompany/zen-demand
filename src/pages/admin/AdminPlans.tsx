import { useState } from "react";
import { useAdminPlans, useCreatePlan, useUpdatePlan, useReorderPlans } from "@/hooks/admin/useAdminPlans";
import type { Plan } from "@/hooks/usePlans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, ArrowUp, ArrowDown, CreditCard, Crown,
  LayoutGrid, Users, Kanban, FileText, Layers, StickyNote,
  Check, X, Infinity,
} from "lucide-react";
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

const tierAccents: Record<string, { gradient: string; border: string; icon: string; bg: string }> = {
  starter: {
    gradient: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-500/30",
    icon: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  profissional: {
    gradient: "from-orange-500/10 to-amber-500/5",
    border: "border-orange-500/30",
    icon: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  business: {
    gradient: "from-orange-600/10 to-red-500/5",
    border: "border-orange-600/30",
    icon: "text-orange-600",
    bg: "bg-orange-600/10",
  },
  enterprise: {
    gradient: "from-primary/10 to-orange-600/5",
    border: "border-primary/30",
    icon: "text-primary",
    bg: "bg-primary/10",
  },
};

const defaultAccent = {
  gradient: "from-muted/50 to-muted/20",
  border: "border-border",
  icon: "text-primary",
  bg: "bg-primary/10",
};

function LimitItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | null }) {
  const isUnlimited = value === -1;
  const isDisabled = value === 0;

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      {isUnlimited ? (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1 font-medium">
          <Infinity className="h-3 w-3" />
          Ilimitado
        </Badge>
      ) : isDisabled ? (
        <span className="text-xs text-muted-foreground/50">—</span>
      ) : (
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      )}
    </div>
  );
}

function FeaturePill({ label, value }: { label: string; value: any }) {
  if (value === true) {
    return (
      <div className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 font-medium">
        <Check className="h-2.5 w-2.5" />
        {label}
      </div>
    );
  }
  if (value === false || !value || value === "disabled") {
    return (
      <div className="flex items-center gap-1 text-[10px] bg-muted/60 text-muted-foreground/60 rounded-full px-2 py-0.5 line-through">
        {label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </div>
  );
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
    setForm({ ...defaultForm, sort_order: (plans?.length ?? 0) + 1 });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-muted-foreground text-sm">Gerencie os planos de assinatura do sistema</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum plano cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan, index) => {
            const accent = tierAccents[plan.slug] || defaultAccent;
            const features = plan.features || {};

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg border ${accent.border} ${
                  !plan.is_active ? "opacity-50 grayscale" : ""
                }`}
              >
                {/* Gradient top strip */}
                <div className={`h-1.5 bg-gradient-to-r ${accent.gradient.replace("/10", "").replace("/5", "")} ${accent.gradient}`} />

                <CardContent className="p-4 space-y-4">
                  {/* Header: Order + Name + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-9 w-9 rounded-lg ${accent.bg} flex items-center justify-center shrink-0`}>
                        <Crown className={`h-4.5 w-4.5 ${accent.icon}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{plan.name}</h3>
                        <code className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {plan.slug}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0 || reorderPlans.isPending}
                        onClick={() => handleMove(index, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === plans.length - 1 || reorderPlans.isPending}
                        onClick={() => handleMove(index, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight">
                        {formatCurrency(plan.price_cents)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /{plan.billing_period === "yearly" ? "ano" : "mês"}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-0.5 border-t border-b py-3 border-border/50">
                    <LimitItem icon={Layers} label="Equipes" value={plan.max_teams} />
                    <LimitItem icon={LayoutGrid} label="Quadros" value={plan.max_boards} />
                    <LimitItem icon={Users} label="Membros" value={plan.max_members} />
                    <LimitItem icon={Kanban} label="Demandas/mês" value={plan.max_demands_per_month} />
                    <LimitItem icon={FileText} label="Serviços" value={plan.max_services} />
                    <LimitItem icon={StickyNote} label="Notas" value={plan.max_notes} />
                  </div>

                  {/* Features pills */}
                  <div className="flex flex-wrap gap-1">
                    {featureOptions.map((feat) => (
                      <FeaturePill key={feat.key} label={feat.label} value={features[feat.key]} />
                    ))}
                  </div>

                  {/* Footer: Status + Edit */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={() => handleToggleActive(plan)}
                        disabled={updatePlan.isPending}
                      />
                      <span className="text-xs text-muted-foreground">
                        {plan.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => openEdit(plan)}>
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                <p className="text-xs text-muted-foreground">{formatCurrency(form.price_cents)}</p>
              </div>
              <div className="space-y-2">
                <Label>Período de Cobrança</Label>
                <Select value={form.billing_period} onValueChange={(v) => setForm((f) => ({ ...f, billing_period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                        <SelectTrigger className="w-40"><SelectValue placeholder="Desabilitado" /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createPlan.isPending || updatePlan.isPending}>
              {createPlan.isPending || updatePlan.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
