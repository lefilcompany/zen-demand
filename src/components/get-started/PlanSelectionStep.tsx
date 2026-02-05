import { useTranslation } from "react-i18next";
import { PlanCard } from "@/components/PlanCard";
import { Plan } from "@/hooks/usePlans";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface PlanSelectionStepProps {
  plans: Plan[] | undefined;
  onSelectPlan: (plan: Plan) => void;
}

export function PlanSelectionStep({ plans, onSelectPlan }: PlanSelectionStepProps) {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold">{t("getStarted.step1Title")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{t("getStarted.selectPlanSubtitle")}</p>
        
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <Label
            htmlFor="billing-toggle"
            className={`text-sm cursor-pointer transition-colors ${
              billingPeriod === "monthly" ? "font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            {t("pricing.monthly")}
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingPeriod === "yearly"}
            onCheckedChange={(checked) => setBillingPeriod(checked ? "yearly" : "monthly")}
          />
          <div className="flex items-center gap-2">
            <Label
              htmlFor="billing-toggle"
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

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 pt-2">
        {plans?.map((plan, index) => (
          <div 
            key={plan.id} 
            className="animate-fade-in"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <PlanCard
              plan={plan}
              isPopular={plan.slug === "profissional"}
              onSelect={onSelectPlan}
              billingPeriod={billingPeriod}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
