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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  moderator: "Coordenador",
  executor: "Agente",
  requester: "Solicitante",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  executor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  requester: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

interface AddBoardMemberDialogProps {
  trigger?: React.ReactNode;
  boardId?: string;
}

export function AddBoardMemberDialog({ trigger, boardId: propBoardId }: AddBoardMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

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
    });

    setSelectedUserId("");
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
            O cargo é herdado das configurações da equipe.
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
                      className={`w-full flex items-center justify-between gap-3 p-2 rounded-lg transition-colors ${
                        selectedUserId === member.user_id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{member.full_name}</span>
                      </div>
                      <Badge className={`text-xs ${roleColors[member.teamRole] || ""}`}>
                        {roleLabels[member.teamRole] || member.teamRole}
                      </Badge>
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
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <strong>{selectedMember.full_name}</strong> será adicionado como{" "}
                <Badge className={`text-xs ${roleColors[selectedMember.teamRole] || ""}`}>
                  {roleLabels[selectedMember.teamRole] || selectedMember.teamRole}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Para alterar o cargo, acesse as configurações da equipe.
              </p>
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
