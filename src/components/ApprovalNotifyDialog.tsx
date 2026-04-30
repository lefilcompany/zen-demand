import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { notifyApproval, type ApprovalKind } from "@/lib/approvalNotifications";

interface ApprovalNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandId: string | null;
  demandTitle: string | undefined;
  demandCreatedBy: string | undefined;
  boardId: string | null | undefined;
  boardName?: string;
  approvalType: ApprovalKind;
}

const INTERNAL_ROLES = new Set(["admin", "moderator"]);
const EXTERNAL_ROLES = new Set(["requester"]);

const roleLabel = (role: string) => {
  switch (role) {
    case "admin":
      return "Owner";
    case "moderator":
      return "Coordenador";
    case "executor":
      return "Agente";
    case "requester":
      return "Solicitante";
    default:
      return role;
  }
};

const roleBadgeClass = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40";
    case "moderator":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40";
    case "executor":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40";
    case "requester":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40";
    default:
      return "";
  }
};

export const ApprovalNotifyDialog = React.memo(function ApprovalNotifyDialog({
  open,
  onOpenChange,
  demandId,
  demandTitle,
  demandCreatedBy,
  boardId,
  boardName,
  approvalType,
}: ApprovalNotifyDialogProps) {
  const { user } = useAuth();
  const { data: boardMembers, isLoading: membersLoading } = useBoardMembers(open ? boardId ?? null : null);
  const { preferences, updatePreferencesAsync } = useNotificationPreferences();

  const [mode, setMode] = useState<"all" | "manual">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeCreator, setIncludeCreator] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allowedRoles = approvalType === "internal" ? INTERNAL_ROLES : EXTERNAL_ROLES;

  const eligibleMembers = useMemo(() => {
    if (!boardMembers) return [];
    return boardMembers.filter(
      (m) => allowedRoles.has(m.role) && m.user_id !== user?.id,
    );
  }, [boardMembers, allowedRoles, user?.id]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return eligibleMembers;
    const q = search.toLowerCase();
    return eligibleMembers.filter((m) => {
      const name = (m.profile?.full_name || "").toLowerCase();
      const email = (m.profile?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [eligibleMembers, search]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setMode("all");
      setSelected(new Set());
      setIncludeCreator(preferences.approvalNotifyIncludeCreator);
      setSaveAsDefault(false);
      setSearch("");
      setSubmitting(false);
    }
  }, [open, preferences.approvalNotifyIncludeCreator]);

  const toggleMember = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const finalRecipients = useMemo(() => {
    const ids = new Set<string>();
    if (mode === "all") {
      eligibleMembers.forEach((m) => ids.add(m.user_id));
    } else {
      selected.forEach((id) => ids.add(id));
    }
    if (includeCreator && demandCreatedBy && demandCreatedBy !== user?.id) {
      ids.add(demandCreatedBy);
    }
    return Array.from(ids);
  }, [mode, eligibleMembers, selected, includeCreator, demandCreatedBy, user?.id]);

  const approvalLabel =
    approvalType === "internal" ? "Aprovação Interna" : "Aprovação do Cliente";

  const handleSkip = async () => {
    if (saveAsDefault) {
      try {
        await updatePreferencesAsync({
          ...preferences,
          approvalNotifyMode: "none",
          approvalNotifyIncludeCreator: includeCreator,
        });
        toast.success("Preferência salva: não notificar em aprovações");
      } catch (e) {
        console.error(e);
      }
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!demandId || !user?.id) return;
    if (finalRecipients.length === 0) {
      toast.error("Selecione ao menos um destinatário ou marque 'Pular'");
      return;
    }
    setSubmitting(true);
    try {
      const { sent } = await notifyApproval({
        demandId,
        demandTitle: demandTitle || "",
        boardName,
        approvalType,
        recipientIds: finalRecipients,
        senderId: user.id,
      });

      if (saveAsDefault) {
        try {
          await updatePreferencesAsync({
            ...preferences,
            approvalNotifyMode: mode === "all" ? "all" : "ask",
            approvalNotifyIncludeCreator: includeCreator,
          });
        } catch (e) {
          console.error(e);
        }
      }

      toast.success(
        sent === 1
          ? "1 pessoa notificada sobre a aprovação"
          : `${sent} pessoas notificadas sobre a aprovação`,
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending approval notifications:", error);
      toast.error("Erro ao enviar notificações");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !submitting) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificar sobre aprovação
          </DialogTitle>
          <DialogDescription>
            A demanda{" "}
            <span className="font-medium text-foreground">
              "{demandTitle || "—"}"
            </span>{" "}
            foi movida para{" "}
            <span className="font-medium text-foreground">{approvalLabel}</span>.
            Selecione quem deve ser avisado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "all" | "manual")}
            className="space-y-2"
          >
            <div className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="all" id="notify-all" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="notify-all" className="cursor-pointer font-medium">
                  Todos os elegíveis do quadro
                </Label>
                <p className="text-xs text-muted-foreground">
                  {approvalType === "internal"
                    ? "Owners e Coordenadores deste quadro"
                    : "Solicitantes deste quadro"}
                  {eligibleMembers.length > 0 && ` (${eligibleMembers.length})`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="manual" id="notify-manual" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="notify-manual" className="cursor-pointer font-medium">
                  Selecionar manualmente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Escolha pessoas específicas da lista abaixo.
                </p>
              </div>
            </div>
          </RadioGroup>

          {mode === "manual" && (
            <div className="space-y-2">
              {eligibleMembers.length > 8 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar membro..."
                    className="pl-8 h-9"
                  />
                </div>
              )}

              <ScrollArea className="h-[200px] rounded-md border">
                {membersLoading ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    Nenhum membro elegível encontrado
                  </div>
                ) : (
                  <ul className="p-1">
                    {filteredMembers.map((m) => {
                      const checked = selected.has(m.user_id);
                      const initials = (m.profile?.full_name || "?")
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase();
                      return (
                        <li key={m.user_id}>
                          <button
                            type="button"
                            onClick={() => toggleMember(m.user_id)}
                            className="w-full flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors text-left"
                          >
                            <Checkbox checked={checked} onCheckedChange={() => toggleMember(m.user_id)} />
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={m.profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {m.profile?.full_name || m.profile?.email || "Sem nome"}
                              </p>
                              {m.profile?.job_title && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {m.profile.job_title}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${roleBadgeClass(m.role)}`}>
                              {roleLabel(m.role)}
                            </Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </div>
          )}

          {demandCreatedBy && demandCreatedBy !== user?.id && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="include-creator" className="cursor-pointer text-sm font-medium">
                  Notificar também o criador da demanda
                </Label>
                <p className="text-xs text-muted-foreground">
                  Avisa quem abriu a demanda originalmente.
                </p>
              </div>
              <Checkbox
                id="include-creator"
                checked={includeCreator}
                onCheckedChange={(v) => setIncludeCreator(!!v)}
              />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 bg-muted/20">
            <Checkbox
              id="save-default"
              checked={saveAsDefault}
              onCheckedChange={(v) => setSaveAsDefault(!!v)}
            />
            <Label htmlFor="save-default" className="cursor-pointer text-xs">
              Salvar essa escolha como padrão da minha conta
              <span className="block text-muted-foreground">
                Aplica automaticamente em próximas aprovações (alterável em Configurações).
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={submitting}>
            Pular
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || finalRecipients.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Notificar ({finalRecipients.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
