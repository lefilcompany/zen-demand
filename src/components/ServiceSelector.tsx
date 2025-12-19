import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices } from "@/hooks/useServices";
import { Clock } from "lucide-react";
import { addDays, format } from "date-fns";

interface ServiceSelectorProps {
  teamId: string | null;
  boardId?: string | null;
  value: string;
  onChange: (serviceId: string, estimatedDays?: number) => void;
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
    onChange(serviceId, service?.estimated_days);
  };

  const calculateDueDate = (estimatedDays: number) => {
    return format(addDays(new Date(), estimatedDays), "dd/MM/yyyy");
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
                {service.estimated_days} dias
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                (até {calculateDueDate(service.estimated_days)})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
