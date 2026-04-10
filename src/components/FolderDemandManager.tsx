import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useDemands } from "@/hooks/useDemands";
import { useAllTeamDemands } from "@/hooks/useAllTeamDemands";
import { useFolderDemandIds, useAddDemandToFolder, useRemoveDemandFromFolder } from "@/hooks/useDemandFolders";

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
  const { data: allDemands } = useAllTeamDemands(teamId);
  const { data: folderDemandIds } = useFolderDemandIds(folderId);
  const addDemand = useAddDemandToFolder();
  const removeDemand = useRemoveDemandFromFolder();

  const filteredDemands = useMemo(() => {
    if (!allDemands) return [];
    if (!search.trim()) return allDemands;
    const q = search.toLowerCase();
    return allDemands.filter((d: any) =>
      d.title.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    );
  }, [allDemands, search]);

  const isInFolder = (demandId: string) => folderDemandIds?.includes(demandId) || false;

  const handleToggle = (demandId: string) => {
    if (isInFolder(demandId)) {
      removeDemand.mutate({ folder_id: folderId, demand_id: demandId });
    } else {
      addDemand.mutate({ folder_id: folderId, demand_id: demandId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar demandas — {folderName}</DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar demandas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-[350px] pr-3">
          <div className="space-y-1">
            {filteredDemands.map((d: any) => (
              <label
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={isInFolder(d.id)}
                  onCheckedChange={() => handleToggle(d.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.boards?.name || "—"} · {d.demand_statuses?.name || "—"}
                  </p>
                </div>
                {d.priority && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    d.priority === "alta" ? "bg-destructive/10 text-destructive" :
                    d.priority === "média" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {d.priority}
                  </span>
                )}
              </label>
            ))}
            {filteredDemands.length === 0 && (
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
