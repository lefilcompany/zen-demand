import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { data: boardMembers, isLoading: loadingBoard } = useBoardMembers(boardId || null);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start",
            !selectedUserIds.length && "text-muted-foreground"
          )}
          disabled={disabled || (!teamId && !boardId)}
        >
          <Users className="mr-2 h-4 w-4" />
          {selectedUserIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {selectedMembers?.slice(0, 3).map((member) => (
                  <Avatar key={member.user_id} className="h-5 w-5 ring-2 ring-background">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(member.profile?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm">
                {selectedUserIds.length} selecionado{selectedUserIds.length !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            "Selecionar responsáveis"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] max-w-80 p-0 flex flex-col overflow-hidden"
        align="start"
        sideOffset={4}
        style={{ maxHeight: "70vh" }}
      >
        <div className="shrink-0 p-3 border-b bg-popover">
          <h4 className="font-medium text-sm">Atribuir responsáveis</h4>
          <p className="text-xs text-muted-foreground">
            Selecione os membros {boardId ? "do quadro" : "da equipe"}
          </p>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-2">Carregando...</p>
            ) : members && members.length > 0 ? (
              <div className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted",
                      selectedUserIds.includes(member.user_id) && "bg-muted"
                    )}
                    onClick={() => toggleUser(member.user_id)}
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(member.user_id)}
                      onCheckedChange={() => toggleUser(member.user_id)}
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.profile?.full_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1">{member.profile?.full_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">
                Nenhum membro encontrado
              </p>
            )}
          </div>
        </div>

        {selectedUserIds.length > 0 && (
          <div className="shrink-0 p-2 border-t bg-popover">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
