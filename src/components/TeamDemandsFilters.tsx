import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, X, CalendarIcon, ChevronDown, Check, Briefcase, LayoutGrid } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useTeamPositions } from "@/hooks/useTeamPositions";
import { useBoards } from "@/hooks/useBoards";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const POSITION_FILTER_KEY = "teamDemandsPositionFilter";

export interface TeamDemandsFiltersState {
  status: string | null;
  priority: string | null;
  assignee: string | null;
  service: string | null;
  dueDateFrom: Date | null;
  dueDateTo: Date | null;
  position: string | null;
  board: string | null;
}

interface TeamDemandsFiltersProps {
  teamId: string | null;
  filters: TeamDemandsFiltersState;
  onChange: (filters: TeamDemandsFiltersState) => void;
}

interface NativeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; label: string; color?: string }[];
  placeholder: string;
  showColorDot?: boolean;
  icon?: React.ReactNode;
}

function NativeSelect({ value, onChange, options, placeholder, showColorDot, icon }: NativeSelectProps) {
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
        className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background/50 px-3 py-1.5 text-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <span className={`flex items-center gap-2 ${selectedOption ? "text-foreground" : "text-muted-foreground"}`}>
          {icon}
          {showColorDot && selectedOption?.color && (
            <div 
              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" 
              style={{ backgroundColor: selectedOption.color }} 
            />
          )}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-popover/95 backdrop-blur-sm p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value === "all" ? null : option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  (option.value === "all" && !value) || option.value === value 
                    ? "bg-accent/50 font-medium" 
                    : ""
                }`}
              >
                <div className="flex h-4 w-4 items-center justify-center">
                  {(option.value === "all" && !value) || option.value === value ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : null}
                </div>
                {showColorDot && option.color && (
                  <div 
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" 
                    style={{ backgroundColor: option.color }} 
                  />
                )}
                <span className="truncate">{option.label}</span>
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
        className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background/50 px-3 py-1.5 text-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <span className={`flex items-center gap-2 ${selectedMember ? "text-foreground" : "text-muted-foreground"}`}>
          {selectedMember && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={selectedMember.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {getInitials(selectedMember.profile?.full_name || "?")}
              </AvatarFallback>
            </Avatar>
          )}
          {selectedMember?.profile?.full_name || "Todos"}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-popover/95 backdrop-blur-sm p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                !value ? "bg-accent/50 font-medium" : ""
              }`}
            >
              <div className="flex h-4 w-4 items-center justify-center">
                {!value && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
              <span>Todos</span>
            </button>
            {members?.map((member) => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => {
                  onChange(member.user_id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  member.user_id === value ? "bg-accent/50 font-medium" : ""
                }`}
              >
                <div className="flex h-4 w-4 items-center justify-center">
                  {member.user_id === value && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
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

export function TeamDemandsFilters({ teamId, filters, onChange }: TeamDemandsFiltersProps) {
  const [open, setOpen] = useState(false);
  const { data: services } = useServices(teamId, null);
  const { data: positions } = useTeamPositions(teamId);
  const { data: boards } = useBoards(teamId);
  const { data: members } = useTeamMembers(teamId);

  // Count active filters excluding status (since it's now in tabs)
  const activeFiltersCount = Object.entries(filters)
    .filter(([key, value]) => key !== 'status' && Boolean(value))
    .length;

  // Persist position filter to localStorage
  useEffect(() => {
    if (filters.position) {
      localStorage.setItem(POSITION_FILTER_KEY, filters.position);
    } else {
      localStorage.removeItem(POSITION_FILTER_KEY);
    }
  }, [filters.position]);

  const clearFilters = () => {
    onChange({
      status: null,
      priority: null,
      assignee: null,
      service: null,
      dueDateFrom: null,
      dueDateTo: null,
      position: null,
      board: null,
    });
  };

  const updateFilter = <K extends keyof TeamDemandsFiltersState>(
    key: K,
    value: TeamDemandsFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

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

  const positionOptions = [
    { value: "all", label: "Todos" },
    ...(positions?.map(p => ({ value: p.id, label: p.name, color: p.color })) || [])
  ];

  const boardOptions = [
    { value: "all", label: "Todos" },
    ...(boards?.map(b => ({ value: b.id, label: b.name })) || [])
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-[320px] p-0 max-h-[80vh] overflow-y-auto" align="start" sideOffset={8}>
        <div className="border-b border-border bg-muted/30 px-4 py-3 rounded-t-lg sticky top-0 z-10">
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

        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Prioridade</label>
              <NativeSelect
                value={filters.priority}
                onChange={(v) => updateFilter("priority", v)}
                options={priorityOptions}
                placeholder="Todas"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" /> Quadro
              </label>
              <NativeSelect
                value={filters.board}
                onChange={(v) => updateFilter("board", v)}
                options={boardOptions}
                placeholder="Todos"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Responsável</label>
            <AssigneeSelect
              value={filters.assignee}
              onChange={(v) => updateFilter("assignee", v)}
              members={members}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Serviço</label>
              <NativeSelect
                value={filters.service}
                onChange={(v) => updateFilter("service", v)}
                options={serviceOptions}
                placeholder="Todos"
              />
            </div>

            {positions && positions.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Cargo
                </label>
                <NativeSelect
                  value={filters.position}
                  onChange={(v) => updateFilter("position", v)}
                  options={positionOptions}
                  placeholder="Todos"
                  showColorDot
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Vencimento</label>
            <div className="flex gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex-1 justify-start h-8 rounded-lg bg-background/50 hover:bg-accent/50 text-xs px-2 ${
                      filters.dueDateFrom ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {filters.dueDateFrom
                      ? format(filters.dueDateFrom, "dd/MM", { locale: ptBR })
                      : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" side="bottom" align="start">
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex-1 justify-start h-8 rounded-lg bg-background/50 hover:bg-accent/50 text-xs px-2 ${
                      filters.dueDateTo ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {filters.dueDateTo
                      ? format(filters.dueDateTo, "dd/MM", { locale: ptBR })
                      : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" side="bottom" align="end">
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
      </PopoverContent>
    </Popover>
  );
}
