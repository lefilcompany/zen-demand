import { format, startOfMonth, endOfMonth } from "date-fns";
import { Filter, CalendarIcon, CircleDashed, CheckCircle2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface TimeFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  deliveryFilter: string;
  onDeliveryFilterChange: (value: string) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  uniqueUsers: Profile[];
  onClearFilters: () => void;
}

export function TimeFilters({
  searchTerm,
  onSearchChange,
  userFilter,
  onUserFilterChange,
  deliveryFilter,
  onDeliveryFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  uniqueUsers,
  onClearFilters,
}: TimeFiltersProps) {
  const hasActiveFilters = searchTerm || userFilter !== "all" || deliveryFilter !== "all" || startDate || endDate;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por demanda ou usuário..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Select value={userFilter} onValueChange={onUserFilterChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deliveryFilter} onValueChange={onDeliveryFilterChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status de entrega" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <CircleDashed className="h-4 w-4" />
                    Todas as demandas
                  </div>
                </SelectItem>
                <SelectItem value="delivered">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Somente entregues
                  </div>
                </SelectItem>
                <SelectItem value="not_delivered">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-blue-600" />
                    Somente não entregues
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Período:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={onStartDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={onEndDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onStartDateChange(undefined);
                  onEndDateChange(undefined);
                }}
              >
                Limpar datas
              </Button>
            )}
          </div>
          
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
              >
                Limpar todos os filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
