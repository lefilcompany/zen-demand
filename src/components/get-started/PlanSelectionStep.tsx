import { useTranslation } from "react-i18next";
import { Plan } from "@/hooks/usePlans";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CompactPlanCard } from "./CompactPlanCard";
import { PlanFeaturesComparison } from "./PlanFeaturesComparison";
import { ArrowLeft } from "lucide-react";

interface PlanSelectionStepProps {
  plans: Plan[] | undefined;
  onSelectPlan: (plan: Plan) => void;
  currentPlanSlug?: string | null;
  onBack?: () => void;
}

export function PlanSelectionStep({ plans, onSelectPlan, currentPlanSlug, onBack }: PlanSelectionStepProps) {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + Billing toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t("getStarted.step1Title")}</h2>
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

      {/* Plans grid - 2x2 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans?.map((plan, index) => (
          <div 
            key={plan.id} 
            className="animate-fade-in"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <CompactPlanCard
              plan={plan}
              isPopular={plan.slug === "profissional"}
              isCurrent={plan.slug === currentPlanSlug}
              onSelect={onSelectPlan}
              billingPeriod={billingPeriod}
            />
          </div>
        ))}
      </div>

      {/* Features comparison */}
      {plans && plans.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Comparação de recursos</h3>
          <PlanFeaturesComparison plans={plans} />
        </div>
      )}

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
