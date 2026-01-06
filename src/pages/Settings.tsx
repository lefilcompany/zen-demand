import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Moon, Sun, Monitor, Bell, Mail, Smartphone, Loader2, Send, LogOut, Users, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useNotificationPreferences, NotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/lib/auth";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { currentTeam, selectedTeamId, setSelectedTeamId, teams } = useSelectedTeam();
  const { data: myRole } = useTeamRole(selectedTeamId);
  const { data: teamMembers } = useTeamMembers(selectedTeamId);
  const [mounted, setMounted] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [transferAdminDialogOpen, setTransferAdminDialogOpen] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);
  const [isTransferringAdmin, setIsTransferringAdmin] = useState(false);
  const { preferences, updatePreferences, isLoading } = useNotificationPreferences();
  const { 
    isSupported: isPushSupported, 
    isEnabled: isPushEnabled, 
    isLoading: isPushLoading,
    permissionStatus,
    enablePushNotifications, 
    disablePushNotifications 
  } = usePushNotifications();
  
  const isAdmin = myRole === "admin";
  const isOnlyMember = teamMembers?.length === 1;
  const otherMembers = teamMembers?.filter(m => m.user_id !== user?.id) || [];

  const handleTransferAdminAndLeave = async () => {
    if (!user?.id || !selectedTeamId || !selectedNewAdmin) return;
    
    setIsTransferringAdmin(true);
    try {
      // Transfer admin role to selected member
      const { error: updateError } = await supabase
        .from("team_members")
        .update({ role: "admin" })
        .eq("team_id", selectedTeamId)
        .eq("user_id", selectedNewAdmin);

      if (updateError) throw updateError;

      // Now leave the team
      const { error: leaveError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", selectedTeamId)
        .eq("user_id", user.id);

      if (leaveError) throw leaveError;

      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-role"] });
      
      // Select another team if available
      const remainingTeams = teams?.filter(t => t.id !== selectedTeamId);
      if (remainingTeams && remainingTeams.length > 0) {
        setSelectedTeamId(remainingTeams[0].id);
      } else {
        setSelectedTeamId(null);
        navigate("/welcome");
      }
      
      toast.success("Administração transferida e você saiu da equipe");
      setTransferAdminDialogOpen(false);
      setSelectedNewAdmin(null);
    } catch (error: any) {
      console.error("Error transferring admin:", error);
      toast.error("Erro ao transferir administração");
    } finally {
      setIsTransferringAdmin(false);
    }
  };

  const leaveTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      
      // Select another team if available
      const remainingTeams = teams?.filter(t => t.id !== selectedTeamId);
      if (remainingTeams && remainingTeams.length > 0) {
        setSelectedTeamId(remainingTeams[0].id);
      } else {
        setSelectedTeamId(null);
        navigate("/welcome");
      }
      
      toast.success("Você saiu da equipe com sucesso");
    },
    onError: (error: any) => {
      console.error("Error leaving team:", error);
      toast.error("Erro ao sair da equipe");
    },
  });

  const handleDeleteTeam = async () => {
    if (!user?.email || !deletePassword || !selectedTeamId) return;
    
    setIsDeletingTeam(true);
    try {
      // Verify password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (authError) {
        toast.error("Senha incorreta");
        return;
      }

      // Delete the team
      const { error: deleteError } = await supabase
        .from("teams")
        .delete()
        .eq("id", selectedTeamId);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ["teams"] });
      
      // Select another team if available
      const remainingTeams = teams?.filter(t => t.id !== selectedTeamId);
      if (remainingTeams && remainingTeams.length > 0) {
        setSelectedTeamId(remainingTeams[0].id);
      } else {
        setSelectedTeamId(null);
        navigate("/welcome");
      }
      
      toast.success("Equipe excluída com sucesso");
      setDeleteTeamOpen(false);
      setDeletePassword("");
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error("Erro ao excluir equipe");
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const sendTestNotification = async () => {
    if (!user?.id) return;
    
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: user.id,
          title: "🎉 Teste de Notificação",
          body: "Se você está vendo isso, as notificações push estão funcionando!",
          link: "/settings",
        },
      });

      if (error) throw error;
      
      toast.success("Notificação de teste enviada!");
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setIsSendingTest(false);
    }
  };

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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start sm:items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground mt-1 sm:mt-0 shrink-0" />
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
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isPushEnabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={sendTestNotification}
                        disabled={isSendingTest}
                        className="flex-1 sm:flex-none"
                      >
                        {isSendingTest ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Testar
                      </Button>
                    )}
                    {isPushEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disablePushNotifications}
                        disabled={isPushLoading}
                        className="flex-1 sm:flex-none"
                      >
                        {isPushLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Desativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={enablePushNotifications}
                        disabled={isPushLoading || permissionStatus === "denied"}
                        className="flex-1 sm:flex-none"
                      >
                        {isPushLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ativar
                      </Button>
                    )}
                  </div>
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

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mention-notifications" className="cursor-pointer">
                    Menções
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações quando alguém mencionar você em comentários
                  </p>
                </div>
                <Switch
                  id="mention-notifications"
                  checked={preferences.mentionNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("mentionNotifications", checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        {currentTeam && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipe
              </CardTitle>
              <CardDescription>
                Gerencie sua participação na equipe atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Leave Team - Only show if not the only member (for admins) or if not admin */}
              {(!isAdmin || (isAdmin && !isOnlyMember)) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        Sair da equipe
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isAdmin 
                          ? "Você precisará transferir a administração antes de sair" 
                          : "Você perderá acesso a todos os quadros e demandas"
                        }
                      </p>
                    </div>
                  </div>
                  {isAdmin ? (
                    // Admin needs to transfer role before leaving
                    <Dialog open={transferAdminDialogOpen} onOpenChange={(open) => {
                      setTransferAdminDialogOpen(open);
                      if (!open) setSelectedNewAdmin(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isTransferringAdmin}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Transferir administração</DialogTitle>
                          <DialogDescription>
                            Você é administrador. Antes de sair, selecione um membro para assumir a administração da equipe.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Selecione o novo administrador</Label>
                            <Select value={selectedNewAdmin || ""} onValueChange={setSelectedNewAdmin}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um membro" />
                              </SelectTrigger>
                              <SelectContent>
                                {otherMembers.map((member) => (
                                  <SelectItem key={member.user_id} value={member.user_id}>
                                    {member.profile.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setTransferAdminDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleTransferAdminAndLeave}
                            disabled={!selectedNewAdmin || isTransferringAdmin}
                          >
                            {isTransferringAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Transferir e sair
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    // Non-admin can leave directly
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={leaveTeamMutation.isPending}
                        >
                          {leaveTeamMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                          )}
                          Sair
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sair da equipe?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja sair da equipe "{currentTeam.name}"? 
                            Você perderá acesso a todos os quadros, demandas e dados associados a esta equipe.
                            Para entrar novamente, você precisará do código de acesso.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => leaveTeamMutation.mutate(currentTeam.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sair da equipe
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}

              {/* Delete Team - Admin only */}
              {isAdmin && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">
                        Excluir equipe
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Esta ação é irreversível e excluirá todos os dados
                      </p>
                    </div>
                  </div>
                  <Dialog open={deleteTeamOpen} onOpenChange={(open) => {
                    setDeleteTeamOpen(open);
                    if (!open) {
                      setDeletePassword("");
                      setShowDeletePassword(false);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Excluir equipe "{currentTeam.name}"?</DialogTitle>
                        <DialogDescription>
                          Esta ação é irreversível. Todos os quadros, demandas, membros e dados associados serão permanentemente excluídos.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="delete-password">Confirme sua senha</Label>
                          <div className="relative">
                            <Input
                              id="delete-password"
                              type={showDeletePassword ? "text" : "password"}
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Digite sua senha"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowDeletePassword(!showDeletePassword)}
                            >
                              {showDeletePassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTeamOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={handleDeleteTeam} 
                          disabled={!deletePassword || isDeletingTeam}
                        >
                          {isDeletingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Excluir equipe
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
