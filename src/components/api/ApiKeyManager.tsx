import { useState } from "react";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/hooks/useApiKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_PERMISSIONS = {
  "demands.read": true,
  "demands.write": true,
  "boards.read": true,
  "statuses.read": true,
};

export function ApiKeyManager() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const raw = await createKey.mutateAsync({ name: name.trim(), permissions });
    setGeneratedKey(raw);
    setName("");
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("API key copiada!");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setGeneratedKey(null);
    setShowKey(false);
    setName("");
    setPermissions(DEFAULT_PERMISSIONS);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>Gerencie chaves de acesso para a API REST</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{generatedKey ? "API Key Gerada" : "Criar API Key"}</DialogTitle>
            </DialogHeader>
            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ Copie a chave agora! Ela não será exibida novamente.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                      {showKey ? generatedKey : "•".repeat(40)}
                    </code>
                    <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={copyKey}>
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
                  <Label>Nome da chave</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Integração n8n" />
                </div>
                <div className="space-y-3">
                  <Label>Permissões</Label>
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{key}</span>
                      <Switch checked={value} onCheckedChange={(checked) => setPermissions({ ...permissions, [key]: checked })} />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createKey.isPending}>
                    {createKey.isPending ? "Gerando..." : "Gerar Key"}
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
        ) : !keys?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma API key criada ainda.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{key.name}</span>
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Ativa" : "Revogada"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <code>{key.key_prefix}...</code>
                    <span>Criada em {format(new Date(key.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    {key.last_used_at && (
                      <span>Último uso: {format(new Date(key.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    )}
                  </div>
                </div>
                {key.is_active && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação é irreversível. Integrações que usam esta chave deixarão de funcionar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revokeKey.mutate(key.id)}>Revogar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
