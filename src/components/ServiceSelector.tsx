import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices } from "@/hooks/useServices";
import { useBoardServicesWithUsage, useHasBoardServices } from "@/hooks/useBoardServices";
import { Clock, AlertTriangle, Infinity } from "lucide-react";
import { calculateBusinessDueDate, formatDueDate } from "@/lib/dateUtils";

interface ServiceSelectorProps {
  teamId: string | null;
  boardId?: string | null;
  value: string;
  onChange: (serviceId: string, estimatedHours?: number) => void;
  disabled?: boolean;
}

export function ServiceSelector({
  teamId,
  boardId,
  value,
  onChange,
  disabled = false,
}: ServiceSelectorProps) {
  const { data: teamServices, isLoading: teamServicesLoading } = useServices(teamId, boardId);
  const { hasBoardServices, isLoading: boardServicesLoading } = useHasBoardServices(boardId);
  const { data: boardServicesUsage, isLoading: usageLoading } = useBoardServicesWithUsage(boardId);

  const isLoading = teamServicesLoading || boardServicesLoading || usageLoading;

  // Determine which services to show
  const services = hasBoardServices && boardServicesUsage
    ? boardServicesUsage.map(bs => ({
        id: bs.service_id,
        name: bs.service?.name || "",
        estimated_hours: bs.service?.estimated_hours || 0,
        description: bs.service?.description || null,
        currentCount: bs.currentCount,
        monthlyLimit: bs.monthly_limit,
        remaining: bs.remaining,
        isLimitReached: bs.isLimitReached,
      }))
    : teamServices?.map(s => ({
        id: s.id,
        name: s.name,
        estimated_hours: s.estimated_hours,
        description: s.description,
        currentCount: 0,
        monthlyLimit: 0,
        remaining: Infinity,
        isLimitReached: false,
      })) || [];

  const handleChange = (serviceId: string) => {
    if (serviceId === "none") {
      onChange("none", undefined);
      return;
    }
    
    const service = services.find((s) => s.id === serviceId);
    if (service?.isLimitReached) {
      return; // Don't allow selection of limit-reached services
    }
    onChange(serviceId, service?.estimated_hours);
  };

  const calculateDueDateDisplay = (estimatedHours: number) => {
    const businessDueDate = calculateBusinessDueDate(estimatedHours);
    return formatDueDate(businessDueDate);
  };

  const selectedService = services.find(s => s.id === value);

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || !teamId || isLoading}
    >
      <SelectTrigger className={selectedService?.isLimitReached ? "border-destructive" : ""}>
        <SelectValue placeholder={
          hasBoardServices 
            ? "Selecione um serviço *" 
            : "Selecione um serviço (opcional)"
        } />
      </SelectTrigger>
      <SelectContent>
        {!hasBoardServices && (
          <SelectItem value="none">Nenhum serviço</SelectItem>
        )}
        {services.map((service) => (
          <SelectItem 
            key={service.id} 
            value={service.id}
            disabled={service.isLimitReached}
            className={service.isLimitReached ? "opacity-50" : ""}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="font-medium">{service.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {service.estimated_hours}h
              </span>
              {hasBoardServices && (
                <>
                  {service.isLimitReached ? (
                    <span className="text-xs font-medium text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      LIMITE
                    </span>
                  ) : service.monthlyLimit > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      ({service.remaining} restantes)
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Infinity className="h-3 w-3" />
                    </span>
                  )}
                </>
              )}
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                (até {calculateDueDateDisplay(service.estimated_hours)})
              </span>
            </div>
          </SelectItem>
        ))}
        {services.length === 0 && (
          <SelectItem value="no-services" disabled>
            Nenhum serviço disponível
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
