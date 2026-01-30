import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/priceUtils";
import { Plan } from "@/hooks/usePlans";

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect?: (plan: Plan) => void;
  isLoading?: boolean;
  billingPeriod?: "monthly" | "yearly";
}

export function PlanCard({
  plan,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
  isLoading = false,
  billingPeriod = "monthly",
}: PlanCardProps) {
  const { t } = useTranslation();

  const getIcon = () => {
    switch (plan.slug) {
      case "starter":
        return <Zap className="h-5 w-5" />;
      case "profissional":
        return <Star className="h-5 w-5" />;
      case "business":
        return <Building2 className="h-5 w-5" />;
      case "enterprise":
        return <Building2 className="h-6 w-6" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const features = [
    {
      label: plan.max_boards === -1 ? t("pricing.features.unlimited") : `${plan.max_boards} ${t("pricing.features.boards")}`,
      included: true,
    },
    {
      label: plan.max_members === -1 ? t("pricing.features.unlimited") : `${plan.max_members} ${t("pricing.features.members")}`,
      included: true,
    },
    {
      label: plan.max_demands_per_month === -1 ? t("pricing.features.unlimited") : `${plan.max_demands_per_month} ${t("pricing.features.demands")}`,
      included: true,
    },
    {
      label: t("pricing.features.timeTracking"),
      included: true,
      detail: plan.features.time_tracking === "full" ? t("pricing.features.full") : t("pricing.features.basic"),
    },
    {
      label: t("pricing.features.notifications"),
      included: plan.features.notifications !== "in_app",
      detail: plan.features.notifications === "push_email" || plan.features.notifications === "all" ? "Push + Email" : "In-app",
    },
    {
      label: t("pricing.features.reports"),
      included: !!plan.features.reports,
      detail: plan.features.reports,
    },
    {
      label: t("pricing.features.aiSummary"),
      included: !!plan.features.ai_summary,
    },
    {
      label: t("pricing.features.externalShare"),
      included: !!plan.features.share_external,
    },
    {
      label: t("pricing.features.api"),
      included: !!plan.features.api,
    },
    {
      label: t("pricing.features.sla"),
      included: !!plan.features.sla,
    },
  ];

  const yearlyPrice = Math.round(plan.price_cents * 12 * 0.8); // 20% discount
  const displayPrice = billingPeriod === "yearly" ? yearlyPrice / 12 : plan.price_cents;

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-200 hover:shadow-lg",
        isPopular && "border-primary shadow-md ring-2 ring-primary/20",
        isCurrentPlan && "border-success ring-2 ring-success/20"
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          {t("pricing.popular")}
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success">
          {t("pricing.currentPlan")}
        </Badge>
      )}

      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {getIcon()}
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{formatPrice(displayPrice)}</span>
            <span className="text-muted-foreground">/{t("pricing.month")}</span>
          </div>
          {billingPeriod === "yearly" && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pricing.billedYearly", { total: formatPrice(yearlyPrice) })}
            </p>
          )}
        </div>

        <ul className="mb-6 flex-1 space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  feature.included ? "text-success" : "text-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-sm",
                  !feature.included && "text-muted-foreground/50 line-through"
                )}
              >
                {feature.label}
                {feature.detail && feature.included && (
                  <span className="text-muted-foreground"> ({feature.detail})</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          onClick={() => onSelect?.(plan)}
          disabled={isCurrentPlan || isLoading}
        >
          {isCurrentPlan
            ? t("pricing.currentPlan")
            : plan.slug === "enterprise"
            ? t("pricing.contactSales")
            : t("pricing.selectPlan")}
        </Button>
      </CardContent>
    </Card>
  );
}
