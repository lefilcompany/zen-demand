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
  Plus, Pencil, CreditCard, Crown, Users, Trash2,
  Check, Star, Zap, GripVertical,
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
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const tierConfig: Record<string, { icon: React.ElementType; borderColor: string; badgeBg: string; badgeText: string; label: string }> = {
  starter: {
    icon: Star,
    borderColor: "border-amber-300/50",
    badgeBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeText: "text-amber-700 dark:text-amber-300",
    label: "ESSENCIAL",
  },
  profissional: {
    icon: Zap,
    borderColor: "border-orange-400/50",
    badgeBg: "bg-orange-100 dark:bg-orange-900/30",
    badgeText: "text-orange-700 dark:text-orange-300",
    label: "POPULAR",
  },
  business: {
    icon: Crown,
    borderColor: "border-primary/40",
    badgeBg: "bg-primary/10",
    badgeText: "text-primary",
    label: "BUSINESS",
  },
  enterprise: {
    icon: Crown,
    borderColor: "border-purple-400/50",
    badgeBg: "bg-purple-100 dark:bg-purple-900/30",
    badgeText: "text-purple-700 dark:text-purple-300",
    label: "PREMIUM",
  },
};

const defaultTier = {
  icon: Star,
  borderColor: "border-border",
  badgeBg: "bg-muted",
  badgeText: "text-muted-foreground",
  label: "PLANO",
};

function LimitLine({ label, value }: { label: string; value: number | null }) {
  const display =
    value === -1 ? "Ilimitado" : value === 0 ? "Desabilitado" : `${value}`;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span className="text-foreground/80">
        <span className="font-semibold uppercase">{display}</span>{" "}
        {label}
      </span>
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
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum plano cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {plans.map((plan, index) => {
            const tier = tierConfig[plan.slug] || defaultTier;
            const TierIcon = tier.icon;

            return (
              <Card
                key={plan.id}
                className={`relative rounded-2xl border-2 transition-all hover:shadow-xl ${tier.borderColor} ${
                  !plan.is_active ? "opacity-40 grayscale" : ""
                }`}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Tier Badge */}
                  <div className="mb-4">
                    <Badge
                      variant="secondary"
                      className={`rounded-full px-3 py-1 text-[11px] font-bold tracking-wider gap-1.5 ${tier.badgeBg} ${tier.badgeText} border-0`}
                    >
                      <TierIcon className="h-3.5 w-3.5" />
                      {tier.label}
                    </Badge>
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-extrabold uppercase leading-tight tracking-tight mb-1">
                    {plan.name}
                  </h3>

                  {/* Description */}
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {plan.description}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-3xl font-black tracking-tight">
                      {formatCurrency(plan.price_cents)}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">
                      /{plan.billing_period === "yearly" ? "ano" : "mês"}
                    </span>
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 mb-5 flex-1">
                    <LimitLine label="quadros" value={plan.max_boards} />
                    <LimitLine label="membros" value={plan.max_members} />
                    <LimitLine label="demandas/mês" value={plan.max_demands_per_month} />
                    <LimitLine label="serviços" value={plan.max_services} />
                  </div>

                  {/* Status row */}
                  {!plan.is_active && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 mb-4">
                      <p className="text-xs text-destructive font-medium text-center">
                        PLANO INATIVO
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>0 assinantes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs rounded-lg"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                    </div>
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
                {[
                  { key: "max_teams", label: "Equipes" },
                  { key: "max_boards", label: "Quadros" },
                  { key: "max_members", label: "Membros" },
                  { key: "max_demands_per_month", label: "Demandas/mês" },
                  { key: "max_services", label: "Serviços" },
                  { key: "max_notes", label: "Notas" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type="number"
                      value={(form as any)[field.key]}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
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

            {/* Ordering */}
            <div className="space-y-2">
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">Menor número aparece primeiro</p>
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
