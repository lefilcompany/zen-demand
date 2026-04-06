import dashboardBanner from "@/assets/dashboard-banner.jpg";

interface DashboardBannerProps {
  title?: string;
  subtitle?: string;
}

export function DashboardBanner({ 
  title = "Gestão Inteligente de Demandas",
  subtitle = "Acompanhe suas solicitações em tempo real e mantenha o controle total das suas entregas"
}: DashboardBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl h-32 md:h-40 lg:h-48 shadow-[0_8px_30px_-5px_hsl(var(--primary)/0.5)]">
      <img 
        src={dashboardBanner} 
        alt="Gestão de demandas" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-transparent"></div>
      <div className="relative z-10 h-full flex flex-col justify-center p-4 md:p-6 lg:p-8">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-1 text-white">
          {title}
        </h2>
        <p className="text-white/90 text-xs md:text-sm lg:text-base max-w-md">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
