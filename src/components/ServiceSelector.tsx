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
  value: string;
  onChange: (serviceId: string, estimatedDays?: number) => void;
  disabled?: boolean;
}

export function ServiceSelector({
  teamId,
  value,
  onChange,
  disabled = false,
}: ServiceSelectorProps) {
  const { data: services, isLoading } = useServices(teamId);

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
              <span>{service.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {service.estimated_days} dias
                <span className="text-primary">
                  (até {calculateDueDate(service.estimated_days)})
                </span>
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
