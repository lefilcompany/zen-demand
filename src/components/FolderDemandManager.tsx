import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { useAllTeamDemands } from "@/hooks/useAllTeamDemands";
import { useFolderDemandIds, useAddDemandToFolder, useRemoveDemandFromFolder } from "@/hooks/useDemandFolders";
import { Badge } from "@/components/ui/badge";

interface FolderDemandManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  teamId: string | null;
}

export function FolderDemandManager({
  open,
  onOpenChange,
  folderId,
  folderName,
  teamId,
}: FolderDemandManagerProps) {
  const [search, setSearch] = useState("");
  const [openBoards, setOpenBoards] = useState<Record<string, boolean>>({});
  const { data: allDemands } = useAllTeamDemands(teamId);
  const { data: folderDemandIds } = useFolderDemandIds(folderId);
  const addDemand = useAddDemandToFolder();
  const removeDemand = useRemoveDemandFromFolder();

  // Group demands by board, then filter
  const groupedDemands = useMemo(() => {
    if (!allDemands) return [];

    const q = search.toLowerCase().trim();

    // Filter demands
    const filtered = q
      ? (allDemands as any[]).filter((d: any) =>
          d.title?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.demand_statuses?.name?.toLowerCase().includes(q) ||
          d.priority?.toLowerCase().includes(q) ||
          d.boards?.name?.toLowerCase().includes(q)
        )
      : (allDemands as any[]);

    // Group by board
    const boardMap = new Map<string, { boardName: string; boardId: string; demands: any[] }>();

    for (const d of filtered) {
      const boardId = d.board_id || "unknown";
      const boardName = d.boards?.name || "Sem quadro";
      if (!boardMap.has(boardId)) {
        boardMap.set(boardId, { boardId, boardName, demands: [] });
      }
      boardMap.get(boardId)!.demands.push(d);
    }

    return Array.from(boardMap.values()).sort((a, b) => a.boardName.localeCompare(b.boardName));
  }, [allDemands, search]);

  const isInFolder = (demandId: string) => folderDemandIds?.includes(demandId) || false;

  const handleToggle = (demandId: string) => {
    if (isInFolder(demandId)) {
      removeDemand.mutate({ folder_id: folderId, demand_id: demandId });
    } else {
      addDemand.mutate({ folder_id: folderId, demand_id: demandId });
    }
  };

  const toggleBoard = (boardId: string) => {
    setOpenBoards((prev) => ({ ...prev, [boardId]: !prev[boardId] }));
  };

  // Auto-open all boards when searching
  const isBoardOpen = (boardId: string) => {
    if (search.trim()) return true;
    return openBoards[boardId] ?? true;
  };

  const selectedCount = folderDemandIds?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Gerenciar demandas — {folderName}</DialogTitle>
          </div>
          {selectedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCount} {selectedCount === 1 ? "demanda selecionada" : "demandas selecionadas"}
            </p>
          )}
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, status, prioridade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-[380px] pr-3 -mr-3">
          <div className="space-y-1">
            {groupedDemands.map((group) => {
              const boardSelected = group.demands.filter((d: any) => isInFolder(d.id)).length;
              return (
                <Collapsible
                  key={group.boardId}
                  open={isBoardOpen(group.boardId)}
                  onOpenChange={() => toggleBoard(group.boardId)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                    {isBoardOpen(group.boardId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-foreground truncate flex-1">
                      {group.boardName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {boardSelected > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mr-1">
                          {boardSelected}
                        </Badge>
                      )}
                      {group.demands.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-2 border-l border-border/50 pl-2 space-y-0.5 mb-1">
                      {group.demands.map((d: any) => (
                        <label
                          key={d.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isInFolder(d.id)}
                            onCheckedChange={() => handleToggle(d.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{d.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {d.demand_statuses?.name && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${d.demand_statuses.color}20`,
                                    color: d.demand_statuses.color,
                                  }}
                                >
                                  {d.demand_statuses.name}
                                </span>
                              )}
                              {d.priority && (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    d.priority === "alta"
                                      ? "bg-destructive/10 text-destructive"
                                      : d.priority === "média"
                                      ? "bg-amber-500/10 text-amber-600"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {d.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            {groupedDemands.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma demanda encontrada
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
