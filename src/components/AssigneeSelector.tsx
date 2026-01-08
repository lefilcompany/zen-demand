import { useState, useRef, useEffect } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { Users, X, Check } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

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

  const handleToggle = () => {
    if (!disabled && (teamId || boardId)) {
      setOpen(!open);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
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

      {/* Dropdown */}
      {open && (
        <div 
          className="absolute z-50 mt-1 w-full max-w-80 bg-popover border rounded-md shadow-md overflow-hidden"
          style={{ minWidth: "calc(100vw - 2rem)", maxWidth: "20rem" }}
        >
          {/* Header */}
          <div className="p-3 border-b bg-popover">
            <h4 className="font-medium text-sm">Atribuir responsáveis</h4>
            <p className="text-xs text-muted-foreground">
              Selecione os membros {boardId ? "do quadro" : "da equipe"}
            </p>
          </div>

          {/* Content */}
          <div className="max-h-[240px] overflow-y-auto p-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-2">Carregando...</p>
            ) : members && members.length > 0 ? (
              <div className="space-y-1">
                {members.map((member) => {
                  const isSelected = selectedUserIds.includes(member.user_id);
                  return (
                    <div
                      key={member.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleUser(member.user_id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleUser(member.user_id);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                        "hover:bg-muted focus:bg-muted focus:outline-none",
                        isSelected && "bg-muted"
                      )}
                    >
                      {/* Custom Checkbox */}
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      {/* Avatar */}
                      <div className="h-6 w-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt={member.profile?.full_name || ""}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            {getInitials(member.profile?.full_name || "?")}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <span className="text-sm flex-1 truncate">
                        {member.profile?.full_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">
                Nenhum membro encontrado
              </p>
            )}
          </div>

          {/* Footer - Clear Button */}
          {selectedUserIds.length > 0 && (
            <div className="p-2 border-t bg-popover">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
