import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, X, CalendarIcon, ChevronDown, Check } from "lucide-react";
import { useDemandStatuses } from "@/hooks/useDemands";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { useServices } from "@/hooks/useServices";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface DemandFiltersState {
  status: string | null;
  priority: string | null;
  assignee: string | null;
  service: string | null;
  dueDateFrom: Date | null;
  dueDateTo: Date | null;
}

interface DemandFiltersProps {
  boardId: string | null;
  filters: DemandFiltersState;
  onChange: (filters: DemandFiltersState) => void;
}

interface NativeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

function NativeSelect({ value, onChange, options, placeholder }: NativeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={selectedOption ? "text-foreground" : "text-muted-foreground"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value === "all" ? null : option.value);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex h-4 w-4 items-center justify-center">
                  {(option.value === "all" && !value) || option.value === value ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                </div>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AssigneeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  members: Array<{ user_id: string; profile?: { full_name: string; avatar_url?: string | null } | null }> | undefined;
}

function AssigneeSelect({ value, onChange, members }: AssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMember = members?.find(m => m.user_id === value);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={selectedMember ? "text-foreground" : "text-muted-foreground"}>
          {selectedMember?.profile?.full_name || "Todos"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex h-4 w-4 items-center justify-center">
                {!value && <Check className="h-3 w-3" />}
              </div>
              Todos
            </button>
            {members?.map((member) => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => {
                  onChange(member.user_id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex h-4 w-4 items-center justify-center">
                  {member.user_id === value && <Check className="h-3 w-3" />}
                </div>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.profile?.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.profile?.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DemandFilters({ boardId, filters, onChange }: DemandFiltersProps) {
  const [open, setOpen] = useState(false);
  const { currentTeamId } = useSelectedBoard();
  const { data: statuses } = useDemandStatuses();
  const { data: members } = useBoardMembers(boardId);
  const { data: services } = useServices(currentTeamId, boardId);

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

  const statusOptions = [
    { value: "all", label: "Todos" },
    ...(statuses?.map(s => ({ value: s.id, label: s.name })) || [])
  ];

  const priorityOptions = [
    { value: "all", label: "Todas" },
    { value: "baixa", label: "Baixa" },
    { value: "média", label: "Média" },
    { value: "alta", label: "Alta" },
  ];

  const serviceOptions = [
    { value: "all", label: "Todos" },
    ...(services?.map(s => ({ value: s.id, label: s.name })) || [])
  ];

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
              <div className="mt-1">
                <NativeSelect
                  value={filters.status}
                  onChange={(v) => updateFilter("status", v)}
                  options={statusOptions}
                  placeholder="Todos"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Prioridade</label>
              <div className="mt-1">
                <NativeSelect
                  value={filters.priority}
                  onChange={(v) => updateFilter("priority", v)}
                  options={priorityOptions}
                  placeholder="Todas"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Responsável</label>
              <div className="mt-1">
                <AssigneeSelect
                  value={filters.assignee}
                  onChange={(v) => updateFilter("assignee", v)}
                  members={members}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Serviço</label>
              <div className="mt-1">
                <NativeSelect
                  value={filters.service}
                  onChange={(v) => updateFilter("service", v)}
                  options={serviceOptions}
                  placeholder="Todos"
                />
              </div>
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
