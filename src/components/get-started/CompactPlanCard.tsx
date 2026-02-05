import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Star, Building2, Crown, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/priceUtils";
import { Plan } from "@/hooks/usePlans";

interface CompactPlanCardProps {
  plan: Plan;
  isPopular?: boolean;
  onSelect: (plan: Plan) => void;
  billingPeriod: "monthly" | "yearly";
}

const planConfig: Record<string, { icon: React.ElementType; iconSize: string; gradient: string; iconBg: string }> = {
  starter: { icon: Zap, iconSize: "h-5 w-5", gradient: "from-blue-500/10 to-cyan-500/10", iconBg: "from-blue-500 to-cyan-500" },
  profissional: { icon: Star, iconSize: "h-5 w-5", gradient: "from-primary/20 to-orange-500/10", iconBg: "from-primary to-orange-500" },
  business: { icon: Building2, iconSize: "h-5 w-5", gradient: "from-purple-500/10 to-pink-500/10", iconBg: "from-purple-500 to-pink-500" },
  enterprise: { icon: Crown, iconSize: "h-6 w-6", gradient: "from-amber-500/10 to-yellow-500/10", iconBg: "from-amber-500 to-yellow-500" },
};

export function CompactPlanCard({ plan, isPopular = false, onSelect, billingPeriod }: CompactPlanCardProps) {
  const { t } = useTranslation();
  const config = planConfig[plan.slug] ?? planConfig.starter;
  const Icon = config.icon;

  const yearlyPrice = Math.round(plan.price_cents * 12 * 0.8);
  const displayPrice = billingPeriod === "yearly" ? yearlyPrice / 12 : plan.price_cents;

  return (
    <Card
      className={cn(
        "group relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-visible cursor-pointer",
        isPopular && "ring-2 ring-primary shadow-lg shadow-primary/10 scale-[1.02] z-10"
      )}
      onClick={() => onSelect(plan)}
    >
      {/* Top accent line */}
      {isPopular && (
        <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-primary" />
      )}

      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <Badge className="bg-gradient-to-r from-primary to-orange-500 text-white border-0 shadow-lg shadow-primary/30 px-3 py-0.5 text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" />
            {t("pricing.popular")}
          </Badge>
        </div>
      )}

      {/* Background gradient on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg",
        config.gradient
      )} />

      <CardContent className="relative flex flex-col items-center p-4 pt-6 gap-3">
        {/* Icon */}
        <div className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110",
          config.iconBg
        )}>
          <Icon className={config.iconSize} />
        </div>

        {/* Name */}
        <h3 className="text-base font-bold">{plan.name}</h3>

        {/* Price */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-2xl font-bold">{formatPrice(displayPrice)}</span>
            <span className="text-xs text-muted-foreground">/{t("pricing.month")}</span>
          </div>
          {billingPeriod === "yearly" && (
            <p className="text-[10px] text-success font-medium mt-0.5">
              {t("pricing.yearlyDiscount")}
            </p>
          )}
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className={cn(
            "w-full font-semibold transition-all duration-300",
            isPopular && "bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 shadow-md shadow-primary/20"
          )}
          variant={isPopular ? "default" : "outline"}
        >
          {plan.slug === "enterprise" ? t("pricing.contactSales") : t("pricing.selectPlan")}
        </Button>
      </CardContent>
    </Card>
  );
}
