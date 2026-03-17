import { useState } from "react";
import { useAdminCoupons, useCreateCoupon, useToggleCoupon, useCouponRedemptions } from "@/hooks/admin/useAdminCoupons";
import { usePlans } from "@/hooks/usePlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, Ticket, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function generateCode() {
  return "SOMA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AdminCoupons() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const { data: plans } = usePlans();
  const createCoupon = useCreateCoupon();
  const toggleCoupon = useToggleCoupon();

  const [showCreate, setShowCreate] = useState(false);
  const [showRedemptions, setShowRedemptions] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons</h1>
          <p className="text-muted-foreground">Gerencie cupons de teste grátis</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Cupom
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !coupons?.length ? (
            <div className="p-12 text-center text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cupom criado ainda</p>
            </div>
          ) : (
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
                        onCheckedChange={(checked) =>
                          toggleCoupon.mutate({ id: c.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setShowRedemptions(c.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Resgates
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
