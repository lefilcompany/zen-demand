import { useState } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useNoteShares, useShareNoteWithUser, useRemoveNoteShare } from "@/hooks/useNoteShares";
import { useAuth } from "@/lib/auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Separator } from "@/components/ui/separator";
import { Users, UserPlus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface NoteShareManagerProps {
  noteId: string;
  teamId: string;
}

export function NoteShareManager({ noteId, teamId }: NoteShareManagerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useTeamMembers(teamId);
  const { data: shares = [] } = useNoteShares(noteId);
  const shareWithUser = useShareNoteWithUser();
  const removeShare = useRemoveNoteShare();

  // Filter out the current user and get shared user IDs
  const sharedUserIds = shares.map((s) => s.shared_with_user_id);
  const availableMembers = teamMembers
    .filter((m) => m.user_id !== user?.id)
    .filter((m) => 
      search === "" || 
      m.profile.full_name.toLowerCase().includes(search.toLowerCase())
    );

  const handleToggleShare = (userId: string) => {
    if (sharedUserIds.includes(userId)) {
      removeShare.mutate({ noteId, userId });
    } else {
      shareWithUser.mutate({ noteId, userId });
    }
  };

  const isPending = shareWithUser.isPending || removeShare.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Users className="h-4 w-4" />
          {shares.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {shares.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="end">
        <div className="p-3 border-b space-y-2 bg-popover">
          <h4 className="font-medium text-sm">Compartilhar com membros</h4>
          <Input
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="max-h-56 overflow-y-auto bg-popover">
          <div className="p-2">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? "Nenhum membro encontrado" : "Nenhum membro disponível"}
              </p>
            ) : (
              <div className="space-y-1">
                {availableMembers.map((member) => {
                  const isShared = sharedUserIds.includes(member.user_id);

                  return (
                    <button
                      key={member.user_id}
                      onClick={() => handleToggleShare(member.user_id)}
                      disabled={isPending}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors disabled:opacity-50",
                        isShared
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {member.profile.full_name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile.full_name || "Usuário"}
                        </p>
                        {member.position && (
                          <p 
                            className="text-xs truncate"
                            style={{ color: member.position.color }}
                          >
                            {member.position.name}
                          </p>
                        )}
                      </div>
                      {isShared ? (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {shares.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Compartilhado com {shares.length} {shares.length === 1 ? "pessoa" : "pessoas"}
              </p>
              <div className="flex -space-x-2">
                {shares.slice(0, 5).map((share) => (
                  <Avatar key={share.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={share.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {share.profiles?.full_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {shares.length > 5 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      +{shares.length - 5}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
