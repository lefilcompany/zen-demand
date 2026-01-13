import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, User, Flag, Clock, Briefcase } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTeamPositions } from "@/hooks/useTeamPositions";
import { useAuth } from "@/lib/auth";

export interface KanbanFiltersState {
  myTasks: boolean;
  priority: string | null;
  dueDate: "overdue" | "today" | "week" | null;
  position: string | null;
}

interface KanbanFiltersProps {
  teamId: string | null;
  filters: KanbanFiltersState;
  onChange: (filters: KanbanFiltersState) => void;
}

export function KanbanFilters({ teamId, filters, onChange }: KanbanFiltersProps) {
  const { user } = useAuth();
  const { data: members } = useTeamMembers(teamId);
  const { data: positions } = useTeamPositions(teamId);
  
  const activeFiltersCount = 
    (filters.myTasks ? 1 : 0) + 
    (filters.priority ? 1 : 0) + 
    (filters.dueDate ? 1 : 0) +
    (filters.position ? 1 : 0);

  const clearFilters = () => {
    onChange({ myTasks: false, priority: null, dueDate: null, position: null });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={filters.myTasks ? "default" : "outline"}
        size="sm"
        onClick={() => onChange({ ...filters, myTasks: !filters.myTasks })}
        className="gap-2"
      >
        <User className="h-4 w-4" />
        Minhas
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant={activeFiltersCount > 0 ? "default" : "outline"} 
            size="sm" 
            className="relative gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="h-5 min-w-5 px-1.5 justify-center bg-background text-foreground"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b border-border bg-muted/30 px-4 py-3 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filtros</h4>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Flag className="h-3 w-3" /> Prioridade
              </label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-8 rounded-lg bg-background/50">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="média">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Vencimento
              </label>
              <Select
                value={filters.dueDate || "all"}
                onValueChange={(v) => onChange({ ...filters, dueDate: v === "all" ? null : (v as KanbanFiltersState["dueDate"]) })}
              >
                <SelectTrigger className="h-8 rounded-lg bg-background/50">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="overdue">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      Vencidos
                    </span>
                  </SelectItem>
                  <SelectItem value="today">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Hoje
                    </span>
                  </SelectItem>
                  <SelectItem value="week">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Esta semana
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {positions && positions.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Cargo
                </label>
                <Select
                  value={filters.position || "all"}
                  onValueChange={(v) => onChange({ ...filters, position: v === "all" ? null : v })}
                >
                  <SelectTrigger className="h-8 rounded-lg bg-background/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" 
                            style={{ backgroundColor: pos.color }} 
                          />
                          {pos.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
