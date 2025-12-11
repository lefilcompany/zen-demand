import { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Filter, X, CalendarIcon } from "lucide-react";
import { useDemandStatuses } from "@/hooks/useDemands";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useServices } from "@/hooks/useServices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DemandFiltersState {
  status: string | null;
  priority: string | null;
  assignee: string | null;
  service: string | null;
  dueDateFrom: Date | null;
  dueDateTo: Date | null;
}

interface DemandFiltersProps {
  teamId: string | null;
  filters: DemandFiltersState;
  onChange: (filters: DemandFiltersState) => void;
}

export function DemandFilters({ teamId, filters, onChange }: DemandFiltersProps) {
  const [open, setOpen] = useState(false);
  const { data: statuses } = useDemandStatuses();
  const { data: members } = useTeamMembers(teamId);
  const { data: services } = useServices(teamId);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    onChange({
      status: null,
      priority: null,
      assignee: null,
      service: null,
      dueDateFrom: null,
      dueDateTo: null,
    });
  };

  const updateFilter = <K extends keyof DemandFiltersState>(
    key: K,
    value: DemandFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => updateFilter("status", v === "all" ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statuses?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Prioridade</label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(v) => updateFilter("priority", v === "all" ? null : v)}
              >
                <SelectTrigger className="mt-1">
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
              <label className="text-sm text-muted-foreground">Responsável</label>
              <Select
                value={filters.assignee || "all"}
                onValueChange={(v) => updateFilter("assignee", v === "all" ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Serviço</label>
              <Select
                value={filters.service || "all"}
                onValueChange={(v) => updateFilter("service", v === "all" ? null : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Data de vencimento</label>
              <div className="flex gap-2 mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {filters.dueDateFrom
                        ? format(filters.dueDateFrom, "dd/MM", { locale: ptBR })
                        : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateFrom || undefined}
                      onSelect={(d) => updateFilter("dueDateFrom", d || null)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {filters.dueDateTo
                        ? format(filters.dueDateTo, "dd/MM", { locale: ptBR })
                        : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateTo || undefined}
                      onSelect={(d) => updateFilter("dueDateTo", d || null)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
