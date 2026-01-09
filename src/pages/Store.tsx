import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/hooks/useServices";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoardSafe } from "@/contexts/BoardContext";
import { useBoardServicesWithUsage, useHasBoardServices } from "@/hooks/useBoardServices";
import { formatPrice } from "@/lib/priceUtils";
import { Clock, ShoppingCart, AlertTriangle, Infinity, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Store() {
  const navigate = useNavigate();
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId } = useSelectedBoardSafe();
  
  const { data: teamServices, isLoading: teamServicesLoading } = useServices(selectedTeamId, selectedBoardId);
  const { hasBoardServices, isLoading: boardServicesLoading } = useHasBoardServices(selectedBoardId);
  const { data: boardServicesUsage, isLoading: usageLoading } = useBoardServicesWithUsage(selectedBoardId);

  const isLoading = teamServicesLoading || boardServicesLoading || usageLoading;

  // Build unified services list
  const services = hasBoardServices && boardServicesUsage
    ? boardServicesUsage.map(bs => ({
        id: bs.service_id,
        name: bs.service?.name || "",
        description: bs.service?.description || null,
        estimated_hours: bs.service?.estimated_hours || 0,
        price_cents: (bs.service as any)?.price_cents || 0,
        currentCount: bs.currentCount,
        monthlyLimit: bs.monthly_limit,
        remaining: bs.remaining,
        isLimitReached: bs.isLimitReached,
      }))
    : teamServices?.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        estimated_hours: s.estimated_hours,
        price_cents: (s as any).price_cents || 0,
        currentCount: 0,
        monthlyLimit: 0,
        remaining: Infinity,
        isLimitReached: false,
      })) || [];

  const handleRequestService = (serviceId: string) => {
    navigate(`/demands/request?serviceId=${serviceId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingCart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Loja de Serviços</h1>
          <p className="text-muted-foreground">Solicite serviços disponíveis para sua equipe</p>
        </div>
      </div>

      {/* Services Grid */}
      {services.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className={`flex flex-col transition-all hover:shadow-lg ${
                service.isLimitReached ? "opacity-60" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-tight">{service.name}</CardTitle>
                  {service.price_cents > 0 ? (
                    <Badge variant="secondary" className="shrink-0 text-base font-bold">
                      {formatPrice(service.price_cents)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-sm">
                      Gratuito
                    </Badge>
                  )}
                </div>
                {service.description && (
                  <CardDescription className="line-clamp-3 mt-2">
                    {service.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Prazo estimado: {service.estimated_hours} horas</span>
                </div>
                
                {hasBoardServices && (
                  <div className="flex items-center gap-2 text-sm">
                    {service.isLimitReached ? (
                      <span className="flex items-center gap-1 text-destructive font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Limite atingido este mês
                      </span>
                    ) : service.monthlyLimit > 0 ? (
                      <span className="text-muted-foreground">
                        {service.remaining} de {service.monthlyLimit} disponíveis
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Infinity className="h-4 w-4" />
                        Ilimitado
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-3 border-t">
                <Button 
                  className="w-full" 
                  disabled={service.isLimitReached}
                  onClick={() => handleRequestService(service.id)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {service.isLimitReached ? "Indisponível" : "Solicitar Serviço"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum serviço disponível</h3>
            <p className="text-muted-foreground max-w-sm">
              Os administradores da equipe ainda não configuraram serviços para este quadro.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
