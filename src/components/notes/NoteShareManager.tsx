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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, X, UserPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteShareManagerProps {
  noteId: string;
  teamId: string;
}

export function NoteShareManager({ noteId, teamId }: NoteShareManagerProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: teamMembers = [] } = useTeamMembers(teamId);
  const { data: shares = [] } = useNoteShares(noteId);
  const shareWithUser = useShareNoteWithUser();
  const removeShare = useRemoveNoteShare();

  // Filter out the current user and get shared user IDs
  const sharedUserIds = shares.map((s) => s.shared_with_user_id);
  const availableMembers = teamMembers.filter(
    (m) => m.user_id !== user?.id
  );

  const handleToggleShare = (userId: string) => {
    if (sharedUserIds.includes(userId)) {
      removeShare.mutate({ noteId, userId });
    } else {
      shareWithUser.mutate({ noteId, userId });
    }
  };

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
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Compartilhar com membros</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione quem pode ver esta nota
          </p>
        </div>

        <ScrollArea className="max-h-64">
          <div className="p-2">
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum membro disponível
              </p>
            ) : (
              <div className="space-y-1">
                {availableMembers.map((member) => {
                  const isShared = sharedUserIds.includes(member.user_id);

                  return (
                    <button
                      key={member.user_id}
                      onClick={() => handleToggleShare(member.user_id)}
                      disabled={shareWithUser.isPending || removeShare.isPending}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                        isShared
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || "Usuário"}
                        </p>
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
        </ScrollArea>

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
                    <AvatarFallback className="text-[10px]">
                      {share.profiles?.full_name?.charAt(0) || "?"}
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
