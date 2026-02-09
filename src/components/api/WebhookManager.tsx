import { useState } from "react";
import { useWebhookSubscriptions, useCreateWebhook, useToggleWebhook, useDeleteWebhook, WEBHOOK_EVENTS } from "@/hooks/useWebhookSubscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Webhook, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function WebhookManager() {
  const { data: webhooks, isLoading } = useWebhookSubscriptions();
  const createWebhook = useCreateWebhook();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!url.trim()) {
      toast.error("URL é obrigatória");
      return;
    }
    if (!selectedEvents.length) {
      toast.error("Selecione pelo menos um evento");
      return;
    }
    const result = await createWebhook.mutateAsync({ url: url.trim(), events: selectedEvents });
    setGeneratedSecret(result.secret);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setUrl("");
    setSelectedEvents([]);
    setGeneratedSecret(null);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>Receba notificações em tempo real sobre eventos</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{generatedSecret ? "Webhook Criado" : "Criar Webhook"}</DialogTitle>
            </DialogHeader>
            {generatedSecret ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ Copie o secret agora! Ele é usado para verificar a assinatura HMAC dos payloads.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded border break-all">{generatedSecret}</code>
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(generatedSecret); toast.success("Secret copiado!"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeDialog}>Fechar</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>URL do Webhook</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
                </div>
                <div className="space-y-3">
                  <Label>Eventos</Label>
                  {WEBHOOK_EVENTS.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEvents.includes(value)}
                        onCheckedChange={() => toggleEvent(value)}
                      />
                      <span className="text-sm">{label} <code className="text-xs text-muted-foreground">({value})</code></span>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createWebhook.isPending}>
                    {createWebhook.isPending ? "Criando..." : "Criar Webhook"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !webhooks?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm truncate max-w-[300px]">{wh.url}</code>
                    <Badge variant={wh.is_active ? "default" : "secondary"}>
                      {wh.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(wh.events as string[]).map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                  {wh.last_triggered_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Último disparo: {format(new Date(wh.last_triggered_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={wh.is_active}
                    onCheckedChange={(checked) => toggleWebhook.mutate({ id: wh.id, is_active: checked })}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover webhook?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Todos os logs deste webhook também serão removidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteWebhook.mutate(wh.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
