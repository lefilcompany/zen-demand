import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Settings2 } from "lucide-react";

export interface DashboardWidgets {
  statsCards: boolean;
  teamsCard: boolean;
  welcomeCard: boolean;
  demandTrend: boolean;
  adjustmentTrend: boolean;
  priorityChart: boolean;
  completionTime: boolean;
  recentActivities: boolean;
}

const DEFAULT_WIDGETS: DashboardWidgets = {
  statsCards: true,
  teamsCard: true,
  welcomeCard: true,
  demandTrend: true,
  adjustmentTrend: true,
  priorityChart: true,
  completionTime: true,
  recentActivities: true,
};

const WIDGET_LABELS: Record<keyof DashboardWidgets, string> = {
  statsCards: "Cards de Estatísticas",
  teamsCard: "Card de Equipes",
  welcomeCard: "Card de Boas-vindas",
  demandTrend: "Gráfico de Tendência de Demandas",
  adjustmentTrend: "Gráfico de Tendência de Ajustes",
  priorityChart: "Gráfico de Prioridades",
  completionTime: "Tempo Médio de Conclusão",
  recentActivities: "Atividades Recentes",
};

const STORAGE_KEY = "dashboard-widgets-config";

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidgets>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDGETS;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_WIDGETS, ...JSON.parse(saved) } : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  return { widgets, setWidgets };
}

interface DashboardCustomizerProps {
  widgets: DashboardWidgets;
  onChange: (widgets: DashboardWidgets) => void;
}

export function DashboardCustomizer({ widgets, onChange }: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [tempWidgets, setTempWidgets] = useState(widgets);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTempWidgets(widgets);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    onChange(tempWidgets);
    setOpen(false);
  };

  const handleReset = () => {
    setTempWidgets(DEFAULT_WIDGETS);
  };

  const handleToggle = (key: keyof DashboardWidgets) => {
    setTempWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Personalizar</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>
            Escolha quais widgets deseja visualizar no seu dashboard.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-4">
          {(Object.keys(WIDGET_LABELS) as Array<keyof DashboardWidgets>).map((key) => (
            <div key={key} className="flex items-center space-x-3">
              <Checkbox
                id={key}
                checked={tempWidgets[key]}
                onCheckedChange={() => handleToggle(key)}
              />
              <Label 
                htmlFor={key} 
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {WIDGET_LABELS[key]}
              </Label>
            </div>
          ))}
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
