import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, X } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useShareFolder, useUnshareFolder } from "@/hooks/useDemandFolders";
import { useAuth } from "@/lib/auth";

interface FolderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  teamId: string | null;
  sharedWith: { user_id: string; shared_at: string }[];
}

export function FolderShareDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  teamId,
  sharedWith,
}: FolderShareDialogProps) {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { data: members } = useTeamMembers(teamId);
  const shareFolder = useShareFolder();
  const unshareFolder = useUnshareFolder();

  const sharedUserIds = useMemo(() => new Set(sharedWith.map((s) => s.user_id)), [sharedWith]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    // Exclude the current user (owner)
    const otherMembers = members.filter((m: any) => m.user_id !== user?.id);
    if (!search.trim()) return otherMembers;
    const q = search.toLowerCase();
    return otherMembers.filter((m: any) =>
      m.profiles?.full_name?.toLowerCase().includes(q) ||
      m.profiles?.email?.toLowerCase().includes(q)
    );
  }, [members, search, user?.id]);

  const handleToggle = (userId: string) => {
    if (sharedUserIds.has(userId)) {
      unshareFolder.mutate({ folder_id: folderId, user_id: userId });
    } else {
      shareFolder.mutate({ folder_id: folderId, user_id: userId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            Compartilhar — {folderName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Membros compartilhados verão apenas demandas dos quadros em que estão alocados.
          </p>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-[300px] pr-3 -mr-3">
          <div className="space-y-0.5">
            {filteredMembers.map((m: any) => {
              const profile = m.profiles;
              const isShared = sharedUserIds.has(m.user_id);
              return (
                <label
                  key={m.user_id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isShared}
                    onCheckedChange={() => handleToggle(m.user_id)}
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-[10px]">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{profile?.full_name || "Sem nome"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{profile?.email || ""}</p>
                  </div>
                  {isShared && (
                    <span className="text-[10px] text-primary font-medium shrink-0">Compartilhado</span>
                  )}
                </label>
              );
            })}
            {filteredMembers.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum membro encontrado
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
