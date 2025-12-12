import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Moon, Sun, Monitor, Bell, Mail, Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useNotificationPreferences, NotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { preferences, updatePreferences, isLoading } = useNotificationPreferences();
  const { 
    isSupported: isPushSupported, 
    isEnabled: isPushEnabled, 
    isLoading: isPushLoading,
    permissionStatus,
    enablePushNotifications, 
    disablePushNotifications 
  } = usePushNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const themeLabel = newTheme === "dark" ? t("settings.themeDark") : newTheme === "light" ? t("settings.themeLight") : t("settings.themeSystem");
    toast.success(`${t("settings.theme")}: ${themeLabel}`);
  };

  const handleLanguageChange = (newLanguage: string) => {
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("app-language", newLanguage);
    toast.success(t("toast.languageUpdated"));
  };

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    updatePreferences(newPrefs);
    toast.success(t("toast.settingsSaved"));
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground">
            {t("settings.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="h-5 w-5" />
              {t("settings.appearance")}
            </CardTitle>
            <CardDescription>
              {t("settings.appearanceDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>{t("settings.theme")}</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun className="h-4 w-4" />
                  {t("settings.themeLight")}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon className="h-4 w-4" />
                  {t("settings.themeDark")}
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => handleThemeChange("system")}
                >
                  <Monitor className="h-4 w-4" />
                  {t("settings.themeSystem")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">🌐</span>
              {t("settings.languageRegion")}
            </CardTitle>
            <CardDescription>
              {t("settings.languageDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="language">{t("settings.language")}</Label>
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder={t("settings.language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t("settings.languageApplied")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("settings.notifications")}
            </CardTitle>
            <CardDescription>
              {t("settings.notificationsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Channels */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">{t("settings.notificationChannels")}</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-notifications" className="cursor-pointer">
                      {t("settings.emailNotifications")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.emailNotificationsDesc")}
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="push-notifications" className="cursor-pointer">
                      {t("settings.pushNotifications")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.pushNotificationsDesc")}
                    </p>
                  </div>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("pushNotifications", checked)}
                  disabled={isLoading}
                />
              </div>

              {/* Push Notifications Activation */}
              {isPushSupported && (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="cursor-pointer font-medium">
                        Notificações do Navegador
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {isPushEnabled 
                          ? "Notificações push estão ativas neste dispositivo" 
                          : permissionStatus === "denied"
                          ? "Permissão negada. Habilite nas configurações do navegador."
                          : "Receba notificações mesmo quando o navegador estiver minimizado"
                        }
                      </p>
                    </div>
                  </div>
                  {isPushEnabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disablePushNotifications}
                      disabled={isPushLoading}
                    >
                      {isPushLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={enablePushNotifications}
                      disabled={isPushLoading || permissionStatus === "denied"}
                    >
                      {isPushLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Ativar
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Notification Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">{t("settings.notificationTypes")}</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="demand-updates" className="cursor-pointer">
                    {t("settings.demandUpdates")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.demandUpdatesDesc")}
                  </p>
                </div>
                <Switch
                  id="demand-updates"
                  checked={preferences.demandUpdates}
                  onCheckedChange={(checked) => handleNotificationChange("demandUpdates", checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="team-updates" className="cursor-pointer">
                    {t("settings.teamUpdates")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.teamUpdatesDesc")}
                  </p>
                </div>
                <Switch
                  id="team-updates"
                  checked={preferences.teamUpdates}
                  onCheckedChange={(checked) => handleNotificationChange("teamUpdates", checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deadline-reminders" className="cursor-pointer">
                    {t("settings.deadlineReminders")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.deadlineRemindersDesc")}
                  </p>
                </div>
                <Switch
                  id="deadline-reminders"
                  checked={preferences.deadlineReminders}
                  onCheckedChange={(checked) => handleNotificationChange("deadlineReminders", checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="adjustment-requests" className="cursor-pointer">
                    {t("settings.adjustmentRequests")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.adjustmentRequestsDesc")}
                  </p>
                </div>
                <Switch
                  id="adjustment-requests"
                  checked={preferences.adjustmentRequests}
                  onCheckedChange={(checked) => handleNotificationChange("adjustmentRequests", checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
