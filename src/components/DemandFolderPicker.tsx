import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemandFolders, useAddDemandToFolder, useRemoveDemandFromFolder } from "@/hooks/useDemandFolders";
import { useAuth } from "@/lib/auth";
import { FolderOpen, Plus, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DemandFolderPickerProps {
  demandId: string;
  teamId: string;
  subdemandIds?: string[];
  canEdit?: boolean;
}

function useDemandFolderLinks(demandId: string | null) {
  return useQuery({
    queryKey: ["demand-folder-links", demandId],
    queryFn: async () => {
      if (!demandId) return [];
      const { data, error } = await supabase
        .from("demand_folder_items")
        .select("folder_id, demand_folders(id, name, color)")
        .eq("demand_id", demandId);
      if (error) throw error;
      return (data || []).map((item: any) => ({
        folderId: item.folder_id as string,
        name: item.demand_folders?.name as string,
        color: item.demand_folders?.color as string,
      }));
    },
    enabled: !!demandId,
  });
}

export function DemandFolderPicker({ demandId, teamId, subdemandIds, canEdit = false }: DemandFolderPickerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: linkedFolders, isLoading } = useDemandFolderLinks(demandId);
  const { data: allFolders } = useDemandFolders(teamId, user?.id);
  const addToFolder = useAddDemandToFolder();
  const removeFromFolder = useRemoveDemandFromFolder();
  const [open, setOpen] = useState(false);

  const linkedFolderIds = useMemo(() => new Set((linkedFolders || []).map(f => f.folderId)), [linkedFolders]);

  const availableFolders = useMemo(() => {
    return (allFolders || []).filter(f => !linkedFolderIds.has(f.id));
  }, [allFolders, linkedFolderIds]);

  const handleAdd = async (folderId: string) => {
    // Add demand to folder
    addToFolder.mutate({ folder_id: folderId, demand_id: demandId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["demand-folder-links", demandId] });
        toast.success("Demanda vinculada à pasta!");
      }
    });

    // Also add all subdemands
    if (subdemandIds && subdemandIds.length > 0) {
      for (const subId of subdemandIds) {
        // Check if already in folder
        const { data: existing } = await supabase
          .from("demand_folder_items")
          .select("id")
          .eq("folder_id", folderId)
          .eq("demand_id", subId)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from("demand_folder_items").insert({ folder_id: folderId, demand_id: subId });
          queryClient.invalidateQueries({ queryKey: ["demand-folder-links", subId] });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["demand-folders"] });
      if (subdemandIds.length > 0) {
        toast.success(`${subdemandIds.length} subdemanda(s) também vinculada(s)!`);
      }
    }

    setOpen(false);
  };

  const handleRemove = async (folderId: string) => {
    removeFromFolder.mutate({ folder_id: folderId, demand_id: demandId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["demand-folder-links", demandId] });
      }
    });

    // Also remove all subdemands from folder
    if (subdemandIds && subdemandIds.length > 0) {
      for (const subId of subdemandIds) {
        await supabase.from("demand_folder_items")
          .delete()
          .eq("folder_id", folderId)
          .eq("demand_id", subId);
        queryClient.invalidateQueries({ queryKey: ["demand-folder-links", subId] });
      }
      queryClient.invalidateQueries({ queryKey: ["demand-folders"] });
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground">Pastas:</span>
      
      {linkedFolders && linkedFolders.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          {linkedFolders.map(folder => (
            <Badge
              key={folder.folderId}
              variant="outline"
              className="text-xs gap-1 pl-1.5 pr-1"
              style={{
                borderColor: `${folder.color}40`,
                backgroundColor: `${folder.color}10`,
                color: folder.color,
              }}
            >
              <FolderOpen className="h-3 w-3" />
              {folder.name}
              {canEdit && (
                <button
                  onClick={() => handleRemove(folder.folderId)}
                  className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">Nenhuma pasta</span>
      )}

      {canEdit && availableFolders.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Vincular
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Selecione uma pasta</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleAdd(folder.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left transition-colors"
                >
                  <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
                  <span className="truncate">{folder.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{folder.item_count}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
