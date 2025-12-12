import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { ArrowLeft, Moon, Sun, Monitor, Bell, BellOff, Globe, Mail, MessageSquare } from "lucide-react";
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

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  demandUpdates: boolean;
  teamUpdates: boolean;
  deadlineReminders: boolean;
}

const defaultNotificationPrefs: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  demandUpdates: true,
  teamUpdates: true,
  deadlineReminders: true,
};

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState("pt-BR");
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotificationPrefs);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Load preferences from localStorage
    const savedLanguage = localStorage.getItem("app-language");
    const savedNotifications = localStorage.getItem("notification-preferences");
    
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(`Tema alterado para ${newTheme === "dark" ? "escuro" : newTheme === "light" ? "claro" : "sistema"}`);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem("app-language", newLanguage);
    toast.success("Idioma atualizado");
  };

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...notifications, [key]: value };
    setNotifications(newPrefs);
    localStorage.setItem("notification-preferences", JSON.stringify(newPrefs));
    toast.success("Preferência de notificação atualizada");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize sua experiência no SoMA
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Tema</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun className="h-4 w-4" />
                  Claro
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon className="h-4 w-4" />
                  Escuro
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => handleThemeChange("system")}
                >
                  <Monitor className="h-4 w-4" />
                  Sistema
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Idioma e Região
            </CardTitle>
            <CardDescription>
              Configure seu idioma preferido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="language">Idioma</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                O idioma será aplicado em toda a interface do aplicativo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Gerencie como você recebe notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Channels */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Canais de Notificação</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-notifications" className="cursor-pointer">
                      Notificações por E-mail
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações importantes por e-mail
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="push-notifications" className="cursor-pointer">
                      Notificações Push
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações no navegador
                    </p>
                  </div>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("pushNotifications", checked)}
                />
              </div>
            </div>

            <Separator />

            {/* Notification Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Tipos de Notificação</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="demand-updates" className="cursor-pointer">
                    Atualizações de Demandas
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mudanças de status e novas interações
                  </p>
                </div>
                <Switch
                  id="demand-updates"
                  checked={notifications.demandUpdates}
                  onCheckedChange={(checked) => handleNotificationChange("demandUpdates", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="team-updates" className="cursor-pointer">
                    Atualizações de Equipe
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Novos membros e solicitações de entrada
                  </p>
                </div>
                <Switch
                  id="team-updates"
                  checked={notifications.teamUpdates}
                  onCheckedChange={(checked) => handleNotificationChange("teamUpdates", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deadline-reminders" className="cursor-pointer">
                    Lembretes de Prazo
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas sobre prazos próximos do vencimento
                  </p>
                </div>
                <Switch
                  id="deadline-reminders"
                  checked={notifications.deadlineReminders}
                  onCheckedChange={(checked) => handleNotificationChange("deadlineReminders", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
