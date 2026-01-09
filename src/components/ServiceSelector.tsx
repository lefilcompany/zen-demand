import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices } from "@/hooks/useServices";
import { useBoardServicesWithUsage, useHasBoardServices } from "@/hooks/useBoardServices";
import { Clock, AlertTriangle, Infinity, Info, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/priceUtils";

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
        price_cents: (bs.service as any)?.price_cents || 0,
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
        price_cents: (s as any).price_cents || 0,
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

  const selectedService = services.find(s => s.id === value);

  return (
    <div className="space-y-2">
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
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-medium truncate max-w-[120px] sm:max-w-none">{service.name}</span>
                {service.price_cents > 0 && (
                  <span className="text-xs font-semibold text-primary flex items-center gap-0.5 whitespace-nowrap">
                    {formatPrice(service.price_cents)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3 shrink-0" />
                  {service.estimated_hours}h
                </span>
                {hasBoardServices && (
                  <>
                    {service.isLimitReached ? (
                      <span className="text-xs font-medium text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        LIMITE
                      </span>
                    ) : service.monthlyLimit > 0 ? (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ({service.remaining} restantes)
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Infinity className="h-3 w-3 shrink-0" />
                      </span>
                    )}
                  </>
                )}
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
      
      {/* Info about when time starts counting */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span className="leading-tight">O prazo inicia após aprovação da solicitação</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px]">
            <p className="text-xs">
              O tempo estimado para conclusão só começa a contar a partir do momento em que sua solicitação for aprovada pela equipe.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
