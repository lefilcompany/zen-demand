import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Bell, Search, Check, ShieldCheck, Shield, User, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import type { ApprovalKind } from "@/lib/approvalNotifications";

const ROLE_FILTER: Record<ApprovalKind, Set<string>> = {
  internal: new Set(["admin", "moderator"]),
  external: new Set(["requester"]),
};

const roleConfig: Record<string, { label: string; badge: string; banner: string; icon: React.ReactNode }> = {
  admin: { label: "Owner", badge: "bg-red-100 text-red-800", banner: "from-red-500/80 via-red-600 to-red-500/60", icon: <ShieldCheck className="h-3 w-3" /> },
  moderator: { label: "Coordenador", badge: "bg-blue-100 text-blue-800", banner: "from-blue-500/80 via-blue-600 to-blue-500/60", icon: <Shield className="h-3 w-3" /> },
  requester: { label: "Solicitante", badge: "bg-purple-100 text-purple-800", banner: "from-purple-500/80 via-purple-600 to-purple-500/60", icon: <User className="h-3 w-3" /> },
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

interface Props {
  boardId: string | null | undefined;
  internalIds: string[];
  externalIds: string[];
  onChangeInternal: (ids: string[]) => void;
  onChangeExternal: (ids: string[]) => void;
  disabled?: boolean;
}

export function ApprovalNotificationsModal({
  boardId,
  internalIds,
  externalIds,
  onChangeInternal,
  onChangeExternal,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ApprovalKind>("internal");
  const [search, setSearch] = useState("");
  const { data: members } = useBoardMembers(boardId ?? null);

  const eligible = useMemo(
    () => (members || []).filter((m) => ROLE_FILTER[tab].has(m.role)),
    [members, tab],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((m) => (m.profile?.full_name || "").toLowerCase().includes(q));
  }, [eligible, search]);

  const currentSelected = tab === "internal" ? internalIds : externalIds;
  const setCurrentSelected = tab === "internal" ? onChangeInternal : onChangeExternal;

  const toggle = (userId: string) => {
    if (currentSelected.includes(userId)) setCurrentSelected(currentSelected.filter((x) => x !== userId));
    else setCurrentSelected([...currentSelected, userId]);
  };

  const summary = (() => {
    const parts: string[] = [];
    if (internalIds.length > 0) parts.push(`Interna: ${internalIds.length}`);
    if (externalIds.length > 0) parts.push(`Cliente: ${externalIds.length}`);
    return parts.length === 0 ? "Padrão (todos serão notificados)" : parts.join(" · ");
  })();

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Notificações de aprovação
        <InfoTooltip text="Personalize quem deve receber notificações nas etapas de aprovação. Se nada for selecionado, o padrão é notificar todos os Owners/Coordenadores (interna) e todos os Solicitantes (cliente)." />
      </Label>
      <button
        type="button"
        disabled={disabled || !boardId}
        onClick={() => setOpen(true)}
        className={cn(
          "w-full h-8 flex items-center justify-between gap-2 px-3 rounded-md border border-input bg-background text-sm",
          "hover:bg-white hover:text-[#F28705] hover:border-[#F28705] transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
          internalIds.length === 0 && externalIds.length === 0 && "text-muted-foreground",
        )}
      >
        <span className="truncate">{summary}</span>
        <Bell className="h-3.5 w-3.5 opacity-60" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Notificações de Aprovação</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha qual etapa configurar e selecione quem deve ser notificado. Se nada for selecionado em uma etapa, todos os elegíveis serão notificados por padrão.
            </p>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b">
            {(["internal", "external"] as const).map((k) => {
              const active = tab === k;
              const count = k === "internal" ? internalIds.length : externalIds.length;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setTab(k); setSearch(""); }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    active
                      ? "border-[#F28705] text-[#F28705]"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "internal" ? <Users className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {k === "internal" ? "Aprovação Interna" : "Aprovação do Cliente"}
                  {count > 0 && (
                    <Badge variant="outline" className="ml-1 text-[10px] border-[#F28705] text-[#F28705]">
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground px-1">
            {tab === "internal"
              ? "Mostrando Administradores e Coordenadores do quadro (responsáveis pela aprovação interna)."
              : "Mostrando Solicitantes do quadro (responsáveis pela aprovação do cliente)."}
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar membro por nome..."
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:border-ring"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-8 text-center">
                {search.trim() ? "Nenhum membro encontrado" : "Nenhum membro elegível neste quadro"}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                {filtered.map((m) => {
                  const isSelected = currentSelected.includes(m.user_id);
                  const config = roleConfig[m.role] || roleConfig.requester;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.user_id)}
                      className={cn(
                        "relative rounded-xl border-2 bg-card overflow-hidden text-left transition-all",
                        "hover:shadow-md focus:outline-none",
                        isSelected ? "border-[#F28705] shadow-md" : "border-border",
                      )}
                    >
                      <div className={`h-10 bg-gradient-to-r ${config.banner} opacity-80`} />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[#F28705] flex items-center justify-center shadow-md">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="relative px-3 pb-3">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                            <AvatarImage src={m.profile?.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="text-sm bg-muted font-semibold">
                              {getInitials(m.profile?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="pt-8 text-center space-y-1.5">
                          <p className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                            {m.profile?.full_name}
                          </p>
                          <Badge className={cn("text-xs", config.badge)}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSelected([])}
              disabled={currentSelected.length === 0}
            >
              Limpar esta etapa
            </Button>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="!bg-[#F28705] hover:!bg-[#F28705]/80 !text-white !border-transparent"
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
