import { useState } from "react";
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
import { UserPlus, Loader2, Shield, Users, Wrench, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const roleOptions: { value: BoardRole; label: string; description: string; icon: React.ElementType }[] = [
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

  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId: contextBoardId } = useSelectedBoard();
  const boardId = propBoardId || contextBoardId;

  const { data: availableMembers, isLoading: membersLoading } = useAvailableTeamMembers(
    selectedTeamId,
    boardId
  );
  const addMember = useAddBoardMember();

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
    setOpen(false);
  };

  const selectedMember = availableMembers?.find((m) => m.user_id === selectedUserId);
  const selectedRoleOption = roleOptions.find((r) => r.value === selectedRole);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Membro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Adicionar Membro ao Quadro</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe e defina o cargo dele neste quadro.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Membro</Label>
              {membersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableMembers && availableMembers.length > 0 ? (
                <div className="rounded-md border p-2 space-y-1 max-h-[120px] overflow-y-auto">
                  {availableMembers.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => setSelectedUserId(member.user_id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-md transition-colors ${
                        selectedUserId === member.user_id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.full_name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{member.full_name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Todos os membros da equipe já estão neste quadro.
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="space-y-2">
                <Label>Cargo no Quadro</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as BoardRole)}
                  className="grid grid-cols-2 gap-2"
                >
                  {roleOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div key={option.value} className="relative">
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={option.value}
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

            {selectedMember && selectedRoleOption && (
              <div className="p-2 rounded-md bg-muted/50 border">
                <p className="text-xs text-muted-foreground">
                  <strong>{selectedMember.full_name}</strong> será adicionado como{" "}
                  <strong>{selectedRoleOption.label}</strong>
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
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
