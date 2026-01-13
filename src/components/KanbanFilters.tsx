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
      >
        <User className="mr-2 h-4 w-4" />
        Minhas
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Flag className="h-3 w-3" /> Prioridade
                </label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? null : v })}
                >
                  <SelectTrigger className="mt-1 h-8">
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

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Vencimento
                </label>
                <Select
                  value={filters.dueDate || "all"}
                  onValueChange={(v) => onChange({ ...filters, dueDate: v === "all" ? null : (v as KanbanFiltersState["dueDate"]) })}
                >
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="overdue">Vencidos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {positions && positions.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Cargo
                  </label>
                  <Select
                    value={filters.position || "all"}
                    onValueChange={(v) => onChange({ ...filters, position: v === "all" ? null : v })}
                  >
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
