import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useHierarchicalServices, ServiceWithHierarchy } from "@/hooks/useServices";
import { useBoardServicesWithUsage, useHasBoardServices } from "@/hooks/useBoardServices";
import { Clock, AlertTriangle, Infinity as InfinityIcon, Info, Folder, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/priceUtils";
import { useMemo, useState } from "react";

interface ServiceSelectorProps {
  teamId: string | null;
  boardId?: string | null;
  value: string;
  onChange: (serviceId: string, estimatedHours?: number) => void;
  disabled?: boolean;
}

interface DisplayService {
  id: string;
  name: string;
  estimated_hours: number;
  description: string | null;
  price_cents: number;
  currentCount: number;
  monthlyLimit: number;
  remaining: number;
  isLimitReached: boolean;
  isCategory?: boolean;
  parent_id?: string | null;
}

// Collapsible category component
function CollapsibleCategory({ 
  category, 
  children, 
  renderServiceItem,
  hasBoardServices 
}: { 
  category: DisplayService; 
  children: DisplayService[]; 
  renderServiceItem: (service: DisplayService, indented?: boolean) => React.ReactNode;
  hasBoardServices: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-sm transition-colors cursor-pointer">
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
        <Folder className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{category.name}</span>
        <span className="text-xs text-muted-foreground/70">{children.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 border-l-2 border-muted ml-3 mt-1 space-y-0.5">
        {children.map((child) => renderServiceItem(child, true))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ServiceSelector({
  teamId,
  boardId,
  value,
  onChange,
  disabled = false,
}: ServiceSelectorProps) {
  const { data: hierarchicalServices, isLoading: servicesLoading, rawServices } = useHierarchicalServices(teamId, boardId);
  const { hasBoardServices, isLoading: boardServicesLoading } = useHasBoardServices(boardId);
  const { data: boardServicesUsage, isLoading: usageLoading } = useBoardServicesWithUsage(boardId);

  const isLoading = servicesLoading || boardServicesLoading || usageLoading;

  // Build services list with board usage info if applicable
  const { categories, standaloneServices, allDisplayServices } = useMemo(() => {
    if (!rawServices) return { categories: [], standaloneServices: [], allDisplayServices: [] };

    // Create a map for board service usage
    const boardUsageMap = new Map(
      boardServicesUsage?.map(bs => [bs.service_id, bs]) || []
    );

    const buildDisplayService = (service: any): DisplayService => {
      const boardUsage = boardUsageMap.get(service.id);
      
      if (hasBoardServices && boardUsage) {
        return {
          id: service.id,
          name: service.name,
          estimated_hours: service.estimated_hours || 0,
          description: service.description || null,
          price_cents: service.price_cents || 0,
          currentCount: boardUsage.currentCount || 0,
          monthlyLimit: boardUsage.monthly_limit || 0,
          remaining: boardUsage.remaining || 0,
          isLimitReached: boardUsage.isLimitReached || false,
          isCategory: service.isCategory,
          parent_id: service.parent_id,
        };
      }
      
      return {
        id: service.id,
        name: service.name,
        estimated_hours: service.estimated_hours || 0,
        description: service.description || null,
        price_cents: service.price_cents || 0,
        currentCount: 0,
        monthlyLimit: 0,
        remaining: Infinity,
        isLimitReached: false,
        isCategory: service.isCategory,
        parent_id: service.parent_id,
      };
    };

    // Separate categories and standalone services
    const cats: { category: DisplayService; children: DisplayService[] }[] = [];
    const standalone: DisplayService[] = [];
    const allDisplay: DisplayService[] = [];

    hierarchicalServices?.forEach(service => {
      if (service.isCategory) {
        const categoryDisplay = buildDisplayService(service);
        const childrenDisplay = service.children.map(child => buildDisplayService(child));
        cats.push({ category: categoryDisplay, children: childrenDisplay });
        allDisplay.push(...childrenDisplay);
      } else {
        const display = buildDisplayService(service);
        standalone.push(display);
        allDisplay.push(display);
      }
    });

    return { categories: cats, standaloneServices: standalone, allDisplayServices: allDisplay };
  }, [hierarchicalServices, rawServices, boardServicesUsage, hasBoardServices]);

  const handleChange = (serviceId: string) => {
    if (serviceId === "none") {
      onChange("none", undefined);
      return;
    }
    
    const service = allDisplayServices.find((s) => s.id === serviceId);
    if (service?.isLimitReached) {
      return; // Don't allow selection of limit-reached services
    }
    onChange(serviceId, service?.estimated_hours);
  };

  const selectedService = allDisplayServices.find(s => s.id === value);

  const renderServiceItem = (service: DisplayService, indented: boolean = false, onClick?: () => void) => (
    <SelectItem 
      key={service.id} 
      value={service.id}
      disabled={service.isLimitReached}
      className={`${service.isLimitReached ? "opacity-50" : ""} ${indented ? "pl-8" : ""}`}
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
                <InfinityIcon className="h-3 w-3 shrink-0" />
              </span>
            )}
          </>
        )}
      </div>
    </SelectItem>
  );

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
          
          {/* Standalone services (no category) */}
          {standaloneServices.map((service) => renderServiceItem(service))}
          
          {/* Categories with their children - collapsible */}
          {categories.map(({ category, children }) => (
            <CollapsibleCategory 
              key={category.id} 
              category={category} 
              children={children}
              renderServiceItem={renderServiceItem}
              hasBoardServices={hasBoardServices}
            />
          ))}
          
          {allDisplayServices.length === 0 && standaloneServices.length === 0 && (
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
