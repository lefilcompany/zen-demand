import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { SectionShell } from "./SectionShell";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotificationPreferences, NotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, Mail, Smartphone, Send, Loader2, Info, CheckCircle2, AlertTriangle, XCircle, Inbox, ChevronDown } from "lucide-react";

type TestNotifType = "info" | "success" | "warning" | "error" | "demand_request";

const TEST_NOTIFICATIONS: { type: TestNotifType; title: string; message: string; icon: any; label: string }[] = [
  { type: "info", label: "Informação", icon: Info, title: "ℹ️ Notificação informativa", message: "Exemplo de notificação do tipo informação." },
  { type: "success", label: "Sucesso", icon: CheckCircle2, title: "✅ Operação concluída", message: "Exemplo de notificação de sucesso." },
  { type: "warning", label: "Aviso", icon: AlertTriangle, title: "⚠️ Atenção necessária", message: "Exemplo de notificação de aviso." },
  { type: "error", label: "Erro", icon: XCircle, title: "❌ Algo deu errado", message: "Exemplo de notificação de erro." },
  { type: "demand_request", label: "Solicitação de demanda", icon: Inbox, title: "[Quadro Teste] 📥 Nova solicitação de demanda", message: "Exemplo de notificação de solicitação de demanda." },
];

export function NotificationsSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { preferences, updatePreferences, isLoading } = useNotificationPreferences();
  const {
    isSupported: isPushSupported,
    isEnabled: isPushEnabled,
    isLoading: isPushLoading,
    permissionStatus,
    enablePushNotifications,
    disablePushNotifications,
  } = usePushNotifications();

  const set = (key: keyof NotificationPreferences, value: boolean) => {
    updatePreferences({ ...preferences, [key]: value });
    toast.success(t("toast.settingsSaved"));
  };

  const [isSendingInApp, setIsSendingInApp] = useState(false);

  const sendTest = async () => {
    if (!user?.id) return;
    setIsSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: { userId: user.id, title: "🎉 Teste de Notificação", body: "Notificações push estão funcionando!", link: "/settings" },
      });
      if (error) throw error;
      toast.success("Notificação de teste enviada!");
    } catch {
      toast.error("Erro ao enviar teste");
    } finally {
      setIsSendingTest(false);
    }
  };

  const sendInAppTest = async () => {
    if (!user?.id) return;
    setIsSendingInApp(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        title: "🔔 Teste de notificação in-app",
        message: "Esta é uma notificação de teste enviada dentro do app.",
        type: "info",
        link: "/settings?tab=notifications",
      });
      if (error) throw error;
      toast.success("Notificação in-app enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e?.message || "desconhecido"));
    } finally {
      setIsSendingInApp(false);
    }
  };

  return (
    <SectionShell icon={Bell} title="Notificações" description="Como e quando receber alertas">
      {/* Channels */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canais</h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="cursor-pointer">E-mail</Label>
              <p className="text-xs text-muted-foreground">Receber e-mails de eventos importantes</p>
            </div>
          </div>
          <Switch checked={preferences.emailNotifications}
            onCheckedChange={(c) => set("emailNotifications", c)} disabled={isLoading} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="cursor-pointer">Push (in-app)</Label>
              <p className="text-xs text-muted-foreground">Notificações dentro da plataforma</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={sendInAppTest} disabled={isSendingInApp}>
              {isSendingInApp ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
              Testar
            </Button>
            <Switch checked={preferences.pushNotifications}
              onCheckedChange={(c) => set("pushNotifications", c)} disabled={isLoading} />
          </div>
        </div>

        {isPushSupported && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <Label className="font-medium">Notificações do Navegador</Label>
                <p className="text-xs text-muted-foreground">
                  {isPushEnabled ? "Ativas neste dispositivo"
                    : permissionStatus === "denied" ? "Permissão negada. Habilite no navegador."
                    : "Receba notificações mesmo com o navegador minimizado"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isPushEnabled && (
                <Button variant="ghost" size="sm" onClick={sendTest} disabled={isSendingTest}>
                  {isSendingTest ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                  Testar
                </Button>
              )}
              {isPushEnabled ? (
                <Button variant="outline" size="sm" onClick={disablePushNotifications} disabled={isPushLoading}>
                  {isPushLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Desativar
                </Button>
              ) : (
                <Button size="sm" onClick={enablePushNotifications} disabled={isPushLoading || permissionStatus === "denied"}>
                  {isPushLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Ativar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Types */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipos</h4>

        {[
          { key: "demandUpdates" as const, label: "Atualizações de demandas", desc: "Mudanças de status, comentários, etc." },
          { key: "teamUpdates" as const, label: "Atualizações da equipe", desc: "Novos membros, mudanças no quadro" },
          { key: "deadlineReminders" as const, label: "Lembretes de prazo", desc: "Alertas antes do vencimento" },
          { key: "adjustmentRequests" as const, label: "Solicitações de ajuste", desc: "Quando alguém pedir alterações" },
          { key: "mentionNotifications" as const, label: "Menções", desc: "Quando alguém te mencionar (@)" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">{label}</Label>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch checked={preferences[key]} onCheckedChange={(c) => set(key, c)} disabled={isLoading} />
          </div>
        ))}
      </div>

      <Separator />

      {/* Approvals */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aprovações</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Comportamento ao mover uma demanda para Aprovação Interna ou do Cliente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <Label>Ao mover para aprovação</Label>
            <p className="text-xs text-muted-foreground">Padrão para essas mudanças.</p>
          </div>
          <Select
            value={preferences.approvalNotifyMode}
            onValueChange={(value) =>
              updatePreferences({ ...preferences, approvalNotifyMode: value as NotificationPreferences["approvalNotifyMode"] })
            }
            disabled={isLoading}
          >
            <SelectTrigger className="w-full sm:w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ask">Sempre perguntar (recomendado)</SelectItem>
              <SelectItem value="all">Notificar todos os elegíveis</SelectItem>
              <SelectItem value="none">Não notificar ninguém</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="cursor-pointer">Incluir criador da demanda</Label>
            <p className="text-xs text-muted-foreground">Notifica também quem criou a demanda.</p>
          </div>
          <Switch
            checked={preferences.approvalNotifyIncludeCreator}
            onCheckedChange={(c) => set("approvalNotifyIncludeCreator", c)}
            disabled={isLoading}
          />
        </div>
      </div>
    </SectionShell>
  );
}
