import { useTranslation } from "react-i18next";
import { Plan } from "@/hooks/usePlans";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, ChevronDown, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/priceUtils";
import { planThemes } from "./CompactPlanCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PlanSelectionStepProps {
  plans: Plan[] | undefined;
  onSelectPlan: (plan: Plan) => void;
  currentPlanSlug?: string | null;
  onBack?: () => void;
}

function PlanFeaturesList({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const theme = planThemes[plan.slug] ?? planThemes.starter;

  const isPremium = plan.slug === "business" || plan.slug === "enterprise";
  const isEnterprise = plan.slug === "enterprise";

  const features = [
    {
      label: t("pricing.features.boards"),
      value: plan.max_boards === -1 ? t("pricing.features.unlimited") : `${plan.max_boards}`,
      included: true,
    },
    {
      label: t("pricing.features.members"),
      value: plan.max_members === -1 ? t("pricing.features.unlimited") : `${plan.max_members}`,
      included: true,
    },
    {
      label: t("pricing.features.demands"),
      value: plan.max_demands_per_month === -1 ? t("pricing.features.unlimited") : `${plan.max_demands_per_month}`,
      included: true,
    },
    {
      label: t("pricing.features.timeTracking"),
      value: isPremium || plan.features.time_tracking === "full" ? t("pricing.features.full") : t("pricing.features.basic"),
      included: true,
    },
    {
      label: t("pricing.features.notifications"),
      value: isPremium || plan.features.notifications === "push_email" || plan.features.notifications === "all" ? "Push + Email" : "In-app",
      included: true,
    },
    {
      label: t("pricing.features.reports"),
      value: isPremium ? "Avançado" : plan.features.reports ? plan.features.reports : null,
      included: isPremium || !!plan.features.reports,
    },
    {
      label: t("pricing.features.aiSummary"),
      value: null,
      included: isPremium || !!plan.features.ai_summary,
    },
    {
      label: t("pricing.features.externalShare"),
      value: null,
      included: isPremium || !!plan.features.share_external,
    },
    {
      label: t("pricing.features.api"),
      value: null,
      included: isPremium || !!plan.features.api,
    },
    {
      label: t("pricing.features.sla"),
      value: null,
      included: isEnterprise || !!plan.features.sla,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 py-3 px-1">
      {features.map((feat, idx) => (
        <div key={idx} className="flex items-center gap-2 py-1">
          {feat.included ? (
            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0", theme.checkBg, theme.checkText)}>
              <Check className="h-3 w-3" />
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground/30 flex items-center justify-center shrink-0">
              <X className="h-3 w-3" />
            </div>
          )}
          <span className={cn("text-sm", feat.included ? "text-foreground" : "text-muted-foreground/50 line-through")}>
            {feat.label}
            {feat.value && feat.included && (
              <span className={cn("ml-1 font-semibold", theme.headerColor)}>({feat.value})</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlanSelectionStep({ plans, onSelectPlan, currentPlanSlug, onBack }: PlanSelectionStepProps) {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openPlan, setOpenPlan] = useState<string | null>(null);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + Billing toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t("getStarted.step2Title")}</h2>
          <p className="text-sm text-muted-foreground">{t("getStarted.selectPlanSubtitle")}</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Label
            htmlFor="gs-billing-toggle"
            className={`text-sm cursor-pointer transition-colors ${
              billingPeriod === "monthly" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            {t("pricing.monthly")}
          </Label>
          <Switch
            id="gs-billing-toggle"
            checked={billingPeriod === "yearly"}
            onCheckedChange={(checked) => setBillingPeriod(checked ? "yearly" : "monthly")}
          />
          <div className="flex items-center gap-2">
            <Label
              htmlFor="gs-billing-toggle"
              className={`text-sm cursor-pointer transition-colors ${
                billingPeriod === "yearly" ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {t("pricing.yearly")}
            </Label>
            <Badge className="bg-success text-success-foreground border-0 text-[10px]">
              {t("pricing.yearlyDiscount")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Plans list - vertical accordion */}
      <div className="flex flex-col gap-3">
        {plans?.map((plan, index) => {
          const theme = planThemes[plan.slug] ?? planThemes.starter;
          const Icon = theme.icon;
          const isCurrent = plan.slug === currentPlanSlug;
          const isPopular = plan.slug === "profissional";
          const isOpen = openPlan === plan.id;

          const yearlyPrice = Math.round(plan.price_cents * 12 * 0.8);
          const displayPrice = billingPeriod === "yearly" ? yearlyPrice / 12 : plan.price_cents;

          return (
            <Collapsible
              key={plan.id}
              open={isOpen}
              onOpenChange={(open) => setOpenPlan(open ? plan.id : null)}
            >
              <div
                className={cn(
                  "relative rounded-xl border-2 transition-all duration-300 overflow-hidden",
                  theme.border,
                  isOpen && "shadow-lg",
                  isCurrent && "ring-2 ring-offset-2 ring-primary",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                {/* Top accent line */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", theme.accentLine)} />

                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none",
                  theme.gradient
                )} />

                {/* Main row - always visible */}
                <CollapsibleTrigger asChild>
                  <div className="relative flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                    {/* Icon */}
                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md shrink-0",
                      theme.iconBg
                    )}>
                      <Icon className={theme.iconSize} />
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={cn("text-base font-bold", theme.headerColor)}>{plan.name}</h3>
                        {isCurrent && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-[10px] px-2 py-0">
                            <Check className="h-3 w-3 mr-1" />
                            {t("pricing.currentPlan")}
                          </Badge>
                        )}
                        {isPopular && !isCurrent && (
                          <Badge className="bg-gradient-to-r from-primary to-orange-500 text-white border-0 text-[10px] px-2 py-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t("pricing.popular")}
                          </Badge>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{plan.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-xl font-bold">{formatPrice(displayPrice)}</span>
                        <span className="text-xs text-muted-foreground">/{t("pricing.month")}</span>
                      </div>
                      {billingPeriod === "yearly" && (
                        <p className="text-[10px] text-success font-medium">{t("pricing.yearlyDiscount")}</p>
                      )}
                    </div>

                    {/* Select button */}
                    <Button
                      size="sm"
                      className={cn("shrink-0 font-semibold border-0 hidden sm:flex", theme.btnClass)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlan(plan);
                      }}
                    >
                      {isCurrent
                        ? t("pricing.currentPlan")
                        : plan.slug === "enterprise"
                          ? t("pricing.contactSales")
                          : t("pricing.selectPlan")}
                    </Button>

                    {/* Chevron */}
                    <ChevronDown className={cn(
                      "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>

                {/* Expandable details */}
                <CollapsibleContent>
                  <div className="relative border-t border-border/30 px-4 pb-4">
                    <PlanFeaturesList plan={plan} />

                    {/* Mobile select button */}
                    <Button
                      className={cn("w-full font-semibold border-0 sm:hidden mt-3", theme.btnClass)}
                      onClick={() => onSelectPlan(plan)}
                    >
                      {isCurrent
                        ? t("pricing.currentPlan")
                        : plan.slug === "enterprise"
                          ? t("pricing.contactSales")
                          : t("pricing.selectPlan")}
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Back button */}
      {onBack && (
        <Button variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("getStarted.backToTeam")}
        </Button>
      )}
    </div>
  );
}
