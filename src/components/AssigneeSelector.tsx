import { useState, useMemo } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { Users, X, Check, ShieldCheck, Shield, Zap, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Role = "admin" | "moderator" | "executor" | "requester";

const roleConfig: Record<Role, { label: string; badgeColor: string; bannerColor: string; icon: React.ReactNode }> = {
  admin: {
    label: "Administrador",
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    bannerColor: "from-red-500/80 via-red-600 to-red-500/60",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  moderator: {
    label: "Coordenador",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    bannerColor: "from-blue-500/80 via-blue-600 to-blue-500/60",
    icon: <Shield className="h-3 w-3" />,
  },
  executor: {
    label: "Agente",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    bannerColor: "from-green-500/80 via-green-600 to-green-500/60",
    icon: <Zap className="h-3 w-3" />,
  },
  requester: {
    label: "Solicitante",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    bannerColor: "from-purple-500/80 via-purple-600 to-purple-500/60",
    icon: <User className="h-3 w-3" />,
  },
};

interface AssigneeSelectorProps {
  teamId: string | null;
  boardId?: string | null;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
  hideIcon?: boolean;
  restrictToUserIds?: string[];
}

export function AssigneeSelector({
  teamId,
  boardId,
  selectedUserIds,
  onChange,
  disabled = false,
  hideIcon = false,
  restrictToUserIds,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers(teamId);
  const { data: boardMembers, isLoading: loadingBoard } = useBoardMembers(
    boardId || null
  );

  // Use board members if boardId is provided, otherwise use team members
  const allMembers = boardId
    ? boardMembers?.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as Role,
        profile: m.profile,
      }))
    : teamMembers?.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as Role,
        profile: m.profile,
      }));

  // Filter to only specific user IDs if restrictToUserIds is provided
  const members = restrictToUserIds && restrictToUserIds.length > 0
    ? allMembers?.filter((m) => restrictToUserIds.includes(m.user_id))
    : allMembers;

  const isLoading = boardId ? loadingBoard : loadingTeam;

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase().trim();
    return members.filter((m) =>
      m.profile?.full_name?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const selectedMembers = members?.filter((m) =>
    selectedUserIds.includes(m.user_id)
  );

  const handleOpen = () => {
    if (!disabled && (teamId || boardId)) {
      setOpen(true);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled || (!teamId && !boardId)}
        className={cn(
          "w-full h-8 flex items-center justify-start gap-2 px-3 py-1 rounded-md border border-input bg-background text-sm shadow-none",
          "hover:bg-accent hover:text-accent-foreground transition-[border-color,box-shadow,background-color,color] duration-200",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:[box-shadow:var(--focus-ring)]",
          "disabled:opacity-50 disabled:pointer-events-none",
          !selectedUserIds.length && "text-muted-foreground"
        )}
      >
        {!hideIcon && <Users className="h-4 w-4 shrink-0" />}
        {selectedUserIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {selectedMembers?.slice(0, 3).map((member) => (
                <div
                  key={member.user_id}
                  className="h-5 w-5 rounded-full ring-2 ring-background overflow-hidden bg-muted flex items-center justify-center shrink-0"
                >
                  {member.profile?.avatar_url ? (
                    <img
                      src={member.profile.avatar_url}
                      alt={member.profile?.full_name || ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {getInitials(member.profile?.full_name || "?")}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-sm">
              {selectedUserIds.length} selecionado
              {selectedUserIds.length !== 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          "Selecionar responsáveis"
        )}
      </button>

      {/* Dialog with Member Cards */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Selecionar Responsáveis</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar membro por nome..."
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring transition-[border-color,box-shadow] duration-200 focus-visible:[box-shadow:var(--focus-ring)]"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Carregando...
              </p>
            ) : filteredMembers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2">
                {filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.user_id);
                  const config = roleConfig[member.role] || roleConfig.requester;
                  
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleUser(member.user_id)}
                      className={cn(
                        "relative rounded-xl border-2 bg-card overflow-hidden transition-all text-left",
                        "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        isSelected
                          ? "border-primary shadow-md"
                          : "border-border"
                      )}
                    >
                      {/* Colored Banner */}
                      <div className={`h-10 bg-gradient-to-r ${config.bannerColor}`} />
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Avatar positioned over banner */}
                      <div className="relative px-3 pb-3">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                          <Avatar className="h-12 w-12 border-3 border-background shadow-lg">
                            <AvatarImage
                              src={member.profile?.avatar_url || undefined}
                              alt={member.profile?.full_name || ""}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-sm bg-muted font-semibold">
                              {getInitials(member.profile?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Member Info */}
                        <div className="pt-8 text-center space-y-1.5">
                          {/* Name */}
                          <p className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                            {member.profile?.full_name}
                          </p>

                          {/* Role Badge */}
                          <Badge className={cn("text-xs", config.badgeColor)}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-8 text-center">
                {search.trim() ? "Nenhum membro encontrado para essa busca" : "Nenhum membro encontrado"}
              </p>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            {selectedUserIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange([])}
                className="flex-1 sm:flex-none"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 sm:flex-none"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
