import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Check, Users, Eye, Pencil, X } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useShareFolder, useUnshareFolder, useUpdateFolderSharePermission, FolderPermission } from "@/hooks/useDemandFolders";
import { useAuth } from "@/lib/auth";

interface FolderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  teamId: string | null;
  sharedWith: { user_id: string; shared_at: string; permission: FolderPermission }[];
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
  const updatePermission = useUpdateFolderSharePermission();

  const sharedMap = useMemo(() => {
    const map = new Map<string, FolderPermission>();
    sharedWith.forEach((s) => map.set(s.user_id, s.permission || "view"));
    return map;
  }, [sharedWith]);

  const sharedCount = sharedMap.size;

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const otherMembers = members.filter((m: any) => m.user_id !== user?.id);
    if (!search.trim()) return otherMembers;
    const q = search.toLowerCase();
    return otherMembers.filter((m: any) =>
      m.profile?.full_name?.toLowerCase().includes(q) ||
      m.profile?.email?.toLowerCase().includes(q)
    );
  }, [members, search, user?.id]);

  const handleToggle = (userId: string) => {
    if (sharedMap.has(userId)) {
      unshareFolder.mutate({ folder_id: folderId, user_id: userId });
    } else {
      shareFolder.mutate({ folder_id: folderId, user_id: userId, permission: "view" });
    }
  };

  const handlePermissionChange = (userId: string, permission: FolderPermission) => {
    updatePermission.mutate({ folder_id: folderId, user_id: userId, permission });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span>Compartilhar pasta</span>
                <p className="text-sm font-normal text-muted-foreground mt-0.5">{folderName}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-lg"
            />
          </div>

          {/* Shared count */}
          {sharedCount > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs font-medium">
                {sharedCount} {sharedCount === 1 ? "pessoa com acesso" : "pessoas com acesso"}
              </Badge>
            </div>
          )}
        </div>

        {/* Member list */}
        <ScrollArea className="h-[280px]">
          <div className="px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
              Membros da equipe
            </p>
            <div className="space-y-0.5">
              {filteredMembers.map((m: any) => {
                const isShared = sharedMap.has(m.user_id);
                const currentPermission = sharedMap.get(m.user_id) || "view";
                const initials = m.profile?.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?";

                return (
                  <div
                    key={m.user_id}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-150 ${
                      isShared
                        ? "bg-primary/5 border border-primary/20"
                        : "border border-transparent"
                    }`}
                  >
                    {/* Toggle button area */}
                    <button
                      onClick={() => handleToggle(m.user_id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={m.profile?.avatar_url || ""} />
                          <AvatarFallback className="text-xs font-medium bg-muted">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {isShared && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-foreground">{m.profile?.full_name || "Sem nome"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.position && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 border"
                              style={{ backgroundColor: m.position.color + "15", borderColor: m.position.color + "40", color: m.position.color }}
                            >
                              {m.position.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Permission selector — only when shared */}
                    {isShared && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={currentPermission}
                          onValueChange={(v) => handlePermissionChange(m.user_id, v as FolderPermission)}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-[11px] gap-1 px-2 border-border/60 bg-background">
                            {currentPermission === "view" ? (
                              <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : (
                              <Pencil className="h-3 w-3 text-primary shrink-0" />
                            )}
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">
                              <div className="flex items-center gap-1.5">
                                <Eye className="h-3 w-3" />
                                <span>Visualizar</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="edit">
                              <div className="flex items-center gap-1.5">
                                <Pencil className="h-3 w-3" />
                                <span>Editar</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          onClick={() => handleToggle(m.user_id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover acesso"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum membro encontrado</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tente buscar com outro termo</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Visualizar = somente leitura</span>
            <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> Editar = gerenciar demandas e nome</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
