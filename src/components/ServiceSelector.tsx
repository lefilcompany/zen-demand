import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices } from "@/hooks/useServices";
import { Clock } from "lucide-react";
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
  const { data: services, isLoading } = useServices(teamId, boardId);

  const handleChange = (serviceId: string) => {
    const service = services?.find((s) => s.id === serviceId);
    onChange(serviceId, service?.estimated_hours);
  };

  const calculateDueDateDisplay = (estimatedHours: number) => {
    const businessDueDate = calculateBusinessDueDate(estimatedHours);
    return formatDueDate(businessDueDate);
  };

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || !teamId || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione um serviço (opcional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum serviço</SelectItem>
        {services?.map((service) => (
          <SelectItem key={service.id} value={service.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{service.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {service.estimated_hours}h
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                (até {calculateDueDateDisplay(service.estimated_hours)})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
