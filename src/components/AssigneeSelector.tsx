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
import { Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssigneeSelectorProps {
  teamId: string | null;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export function AssigneeSelector({
  teamId,
  selectedUserIds,
  onChange,
  disabled = false,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: members, isLoading } = useTeamMembers(teamId);

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
          disabled={disabled || !teamId}
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
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Atribuir responsáveis</h4>
          <p className="text-xs text-muted-foreground">
            Selecione os membros da equipe
          </p>
        </div>
        <div className="max-h-60 overflow-auto p-2">
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
        {selectedUserIds.length > 0 && (
          <div className="p-2 border-t">
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
