import { useState } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { Users, X, Check } from "lucide-react";
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

interface AssigneeSelectorProps {
  teamId: string | null;
  boardId?: string | null;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export function AssigneeSelector({
  teamId,
  boardId,
  selectedUserIds,
  onChange,
  disabled = false,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers(teamId);
  const { data: boardMembers, isLoading: loadingBoard } = useBoardMembers(
    boardId || null
  );

  // Use board members if boardId is provided, otherwise use team members
  const members = boardId
    ? boardMembers?.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        profile: m.profile,
      }))
    : teamMembers;

  const isLoading = boardId ? loadingBoard : loadingTeam;

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
          "w-full flex items-center justify-start gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
          !selectedUserIds.length && "text-muted-foreground"
        )}
      >
        <Users className="h-4 w-4 shrink-0" />
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Responsáveis</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Carregando...
              </p>
            ) : members && members.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {members.map((member) => {
                  const isSelected = selectedUserIds.includes(member.user_id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleUser(member.user_id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={member.profile?.avatar_url || undefined}
                          alt={member.profile?.full_name || ""}
                        />
                        <AvatarFallback className="text-sm font-medium">
                          {getInitials(member.profile?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name */}
                      <span className="text-sm font-medium text-center line-clamp-2">
                        {member.profile?.full_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Nenhum membro encontrado
              </p>
            )}
          </ScrollArea>

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
