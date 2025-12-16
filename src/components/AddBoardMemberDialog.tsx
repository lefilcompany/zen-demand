import { useState } from "react";
import { useAddBoardMember, useAvailableTeamMembers } from "@/hooks/useBoardMembers";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const roleOptions = [
  { value: "requester", label: "Solicitante" },
  { value: "executor", label: "Agente" },
  { value: "moderator", label: "Coordenador" },
  { value: "admin", label: "Administrador" },
] as const;

interface AddBoardMemberDialogProps {
  trigger?: React.ReactNode;
  boardId?: string;
}

export function AddBoardMemberDialog({ trigger, boardId: propBoardId }: AddBoardMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("requester");

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
      role: selectedRole as "admin" | "moderator" | "executor" | "requester",
      addedBy: user.id,
    });

    setSelectedUserId("");
    setSelectedRole("requester");
    setOpen(false);
  };

  const selectedMember = availableMembers?.find((m) => m.user_id === selectedUserId);

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Membro ao Quadro</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe para adicionar a este quadro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Membro</Label>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableMembers && availableMembers.length > 0 ? (
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {availableMembers.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => setSelectedUserId(member.user_id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        selectedUserId === member.user_id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.full_name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{member.full_name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Todos os membros da equipe já estão neste quadro.
              </div>
            )}
          </div>

          {selectedMember && (
            <div className="space-y-2">
              <Label>Cargo no Quadro</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

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
