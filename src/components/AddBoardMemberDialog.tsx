import { useState, useMemo } from "react";
import { useAddBoardMember, useAvailableTeamMembers, BoardRole } from "@/hooks/useBoardMembers";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UserPlus, Loader2, Shield, Users, Wrench, MessageSquare, Check, Search, ShieldCheck, Zap, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TeamRole = "admin" | "moderator" | "executor" | "requester";

const teamRoleConfig: Record<TeamRole, { label: string; badgeColor: string; bannerColor: string; icon: React.ReactNode }> = {
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

const boardRoleOptions: { value: BoardRole; label: string; description: string; icon: React.ElementType }[] = [
  { value: "admin", label: "Administrador", description: "Acesso total ao quadro", icon: Shield },
  { value: "moderator", label: "Coordenador", description: "Gerenciar demandas e membros", icon: Users },
  { value: "executor", label: "Agente", description: "Executar e atualizar demandas", icon: Wrench },
  { value: "requester", label: "Solicitante", description: "Apenas visualizar e solicitar", icon: MessageSquare },
];

interface AddBoardMemberDialogProps {
  trigger?: React.ReactNode;
  boardId?: string;
}

export function AddBoardMemberDialog({ trigger, boardId: propBoardId }: AddBoardMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<BoardRole>("requester");
  const [search, setSearch] = useState("");

  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId: contextBoardId } = useSelectedBoard();
  const boardId = propBoardId || contextBoardId;

  const { data: availableMembers, isLoading: membersLoading } = useAvailableTeamMembers(
    selectedTeamId,
    boardId
  );
  const addMember = useAddBoardMember();

  const filteredMembers = useMemo(() => {
    if (!availableMembers) return [];
    if (!search.trim()) return availableMembers;
    const q = search.toLowerCase();
    return availableMembers.filter(
      (m: any) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.job_title?.toLowerCase().includes(q) ||
        teamRoleConfig[m.team_role as TeamRole]?.label.toLowerCase().includes(q)
    );
  }, [availableMembers, search]);

  const handleSubmit = async () => {
    if (!boardId || !selectedUserId || !user) return;

    await addMember.mutateAsync({
      boardId,
      userId: selectedUserId,
      addedBy: user.id,
      role: selectedRole,
    });

    setSelectedUserId("");
    setSelectedRole("requester");
    setSearch("");
    setOpen(false);
  };

  const selectedMember = availableMembers?.find((m: any) => m.user_id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setSelectedUserId(""); } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Membro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-5 pb-3">
          <DialogTitle>Adicionar Membro ao Quadro</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe e defina o cargo dele neste quadro.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length > 0 ? (
            <ScrollArea className="h-[45vh]">
              <div className="px-5 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredMembers.map((member: any) => {
                  const isSelected = selectedUserId === member.user_id;
                  const role = (member.team_role || "requester") as TeamRole;
                  const config = teamRoleConfig[role] || teamRoleConfig.requester;

                  return (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => setSelectedUserId(member.user_id)}
                      className={cn(
                        "relative flex flex-col items-center rounded-xl border-2 overflow-hidden transition-all text-center",
                        isSelected
                          ? "border-primary shadow-md ring-1 ring-primary/30"
                          : "border-border hover:border-muted-foreground/30 hover:shadow-sm"
                      )}
                    >
                      {/* Gradient banner */}
                      <div className={cn("w-full h-10 bg-gradient-to-r", config.bannerColor)} />

                      {/* Avatar overlapping banner */}
                      <div className="-mt-5 relative">
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="text-sm font-semibold bg-muted">
                            {member.full_name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-2 pt-1.5 pb-3 space-y-1 w-full">
                        <p className="text-xs font-semibold truncate">{member.full_name}</p>
                        {member.job_title && (
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">{member.job_title}</p>
                        )}
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 gap-1 font-medium", config.badgeColor)}>
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : availableMembers && availableMembers.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground px-5">
              Todos os membros da equipe já estão neste quadro.
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground px-5">
              Nenhum membro encontrado para "{search}".
            </div>
          )}

          {selectedMember && (
            <div className="px-5 pt-3 pb-1 space-y-3 border-t">
              <Label className="text-xs text-muted-foreground">Cargo no Quadro</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as BoardRole)}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {boardRoleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value} className="relative">
                      <RadioGroupItem
                        value={option.value}
                        id={`board-role-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`board-role-${option.value}`}
                        className="flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted h-full"
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{option.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{option.description}</p>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="p-5 pt-3 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || addMember.isPending}
          >
            {addMember.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
