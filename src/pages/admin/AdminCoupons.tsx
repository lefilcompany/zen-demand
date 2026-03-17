import { useState } from "react";
import { useAdminCoupons, useCreateCoupon, useToggleCoupon, useCouponRedemptions } from "@/hooks/admin/useAdminCoupons";
import { usePlans } from "@/hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, Ticket, Copy, Check, LayoutGrid, List, Calendar, Users, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TrialCoupon } from "@/hooks/admin/useAdminCoupons";

function generateCode() {
  return "SOMA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AdminCoupons() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const { data: plans } = usePlans();
  const createCoupon = useCreateCoupon();
  const toggleCoupon = useToggleCoupon();

  const [view, setView] = useState<"cards" | "list">("cards");
  const [showCreate, setShowCreate] = useState(false);
  const [showRedemptions, setShowRedemptions] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: generateCode(),
    plan_id: "",
    trial_days: 15,
    max_uses: 1,
    description: "",
    expires_at: "",
  });

  const handleCreate = async () => {
    if (!form.code || !form.plan_id) {
      toast.error("Preencha o código e selecione um plano");
      return;
    }
    try {
      await createCoupon.mutateAsync({
        code: form.code.toUpperCase(),
        plan_id: form.plan_id,
        trial_days: form.trial_days,
        max_uses: form.max_uses,
        description: form.description || undefined,
        expires_at: form.expires_at || null,
      });
      toast.success("Cupom criado com sucesso!");
      setShowCreate(false);
      setForm({ code: generateCode(), plan_id: "", trial_days: 15, max_uses: 1, description: "", expires_at: "" });
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar cupom");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons</h1>
          <p className="text-muted-foreground text-sm">Gerencie cupons de teste grátis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Cupom
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : !coupons?.length ? (
        <div className="p-16 text-center text-muted-foreground rounded-2xl border-2 border-dashed border-border">
          <Ticket className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum cupom criado ainda</p>
          <p className="text-sm mt-1">Crie seu primeiro cupom para começar</p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {coupons.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              onToggle={(checked) => toggleCoupon.mutate({ id: c.id, is_active: checked })}
              onViewRedemptions={() => setShowRedemptions(c.id)}
            />
          ))}
        </div>
      ) : (
        <CouponListView
          coupons={coupons}
          onToggle={(id, checked) => toggleCoupon.mutate({ id, is_active: checked })}
          onViewRedemptions={(id) => setShowRedemptions(id)}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Cupom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="font-mono"
                />
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, code: generateCode() })}>
                  Gerar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dias de teste</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.trial_days}
                  onChange={(e) => setForm({ ...form, trial_days: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. usos</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de expiração (opcional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição interna (opcional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Campanha Black Friday"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createCoupon.isPending}>
              {createCoupon.isPending ? "Criando..." : "Criar Cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redemptions Dialog */}
      <RedemptionsDialog couponId={showRedemptions} onClose={() => setShowRedemptions(null)} />
    </div>
  );
}

/* ─── Coupon Card ─── */

function CouponCard({
  coupon,
  onToggle,
  onViewRedemptions,
}: {
  coupon: TrialCoupon;
  onToggle: (checked: boolean) => void;
  onViewRedemptions: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
  const isMaxed = coupon.times_used >= coupon.max_uses;
  const isUsable = coupon.is_active && !isExpired && !isMaxed;

  const copyCode = () => {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {/* Main coupon body */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
          isUsable
            ? "border-primary/30 bg-card hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
            : "border-border bg-muted/40 opacity-75"
        }`}
      >
        {/* Top decorative bar */}
        <div className={`h-2 w-full ${isUsable ? "bg-gradient-to-r from-primary via-accent to-primary" : "bg-muted-foreground/20"}`} />

        {/* Perforated edge effect */}
        <div className="absolute left-0 top-[4.5rem] -translate-x-1/2 w-6 h-6 rounded-full bg-background border-2 border-r-0 border-border z-10" />
        <div className="absolute right-0 top-[4.5rem] translate-x-1/2 w-6 h-6 rounded-full bg-background border-2 border-l-0 border-border z-10" />

        <div className="p-5">
          {/* Header: Code + Status */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Ticket className={`h-5 w-5 shrink-0 ${isUsable ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-bold text-lg tracking-wide font-mono text-foreground">{coupon.code}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyCode}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {coupon.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-1 pl-7">{coupon.description}</p>
          )}
          {!coupon.description && <div className="mb-3" />}

          {/* Dashed separator to mimic perforation */}
          <div className="border-t-2 border-dashed border-border my-3 mx-[-1.25rem] px-5" />

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <p className="text-2xl font-black text-foreground">{coupon.trial_days}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">dias</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">
                {coupon.times_used}<span className="text-sm font-normal text-muted-foreground">/{coupon.max_uses}</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">usos</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground truncate">{(coupon.plans as any)?.name ?? "—"}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">plano</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {coupon.expires_at
                  ? (isExpired
                      ? <span className="text-destructive">Expirado</span>
                      : format(new Date(coupon.expires_at), "dd/MM/yy", { locale: ptBR }))
                  : "∞"}
              </div>
              <Switch
                checked={coupon.is_active}
                onCheckedChange={onToggle}
                className="scale-75 origin-left"
              />
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={onViewRedemptions}>
              <Eye className="h-3 w-3 mr-1" />
              Resgates
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── List View ─── */

function CouponListView({
  coupons,
  onToggle,
  onViewRedemptions,
}: {
  coupons: TrialCoupon[];
  onToggle: (id: string, checked: boolean) => void;
  onViewRedemptions: (id: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead>Usos</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{c.code}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyCode(c.code, c.id)}
                  >
                    {copiedId === c.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </TableCell>
              <TableCell>{(c.plans as any)?.name ?? "—"}</TableCell>
              <TableCell>{c.trial_days} dias</TableCell>
              <TableCell>{c.times_used}/{c.max_uses}</TableCell>
              <TableCell>
                {c.expires_at
                  ? format(new Date(c.expires_at), "dd/MM/yyyy", { locale: ptBR })
                  : "Sem expiração"}
              </TableCell>
              <TableCell>
                <Switch
                  checked={c.is_active}
                  onCheckedChange={(checked) => onToggle(c.id, checked)}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onViewRedemptions(c.id)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Resgates
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Redemptions Dialog ─── */

function RedemptionsDialog({ couponId, onClose }: { couponId: string | null; onClose: () => void }) {
  const { data, isLoading } = useCouponRedemptions(couponId);

  return (
    <Dialog open={!!couponId} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resgates do Cupom</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.length ? (
          <p className="text-center text-muted-foreground py-6">Nenhum resgate ainda</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipe</TableHead>
                <TableHead>Resgatado por</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.teams?.name ?? "—"}</TableCell>
                  <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                  <TableCell>{format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
