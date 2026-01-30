import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PlanCard } from "@/components/PlanCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePlans, Plan } from "@/hooks/usePlans";
import { useTeamSubscription } from "@/hooks/useSubscription";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { selectedTeamId } = useSelectedTeam();
  const { data: subscription } = useTeamSubscription(selectedTeamId);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.slug === "enterprise") {
      // For enterprise, redirect to contact
      window.open("mailto:contato@soma.com?subject=Interesse no Plano Enterprise", "_blank");
      return;
    }

    if (!selectedTeamId) {
      toast.error(t("pricing.selectTeamFirst"));
      navigate("/teams");
      return;
    }

    // TODO: Integrate with Stripe checkout
    toast.info(t("pricing.comingSoon"));
  };

  const currentPlanSlug = subscription?.plan?.slug;

  const faqs = [
    {
      question: t("pricing.faq.changePlan.question"),
      answer: t("pricing.faq.changePlan.answer"),
    },
    {
      question: t("pricing.faq.trial.question"),
      answer: t("pricing.faq.trial.answer"),
    },
    {
      question: t("pricing.faq.payment.question"),
      answer: t("pricing.faq.payment.answer"),
    },
    {
      question: t("pricing.faq.cancel.question"),
      answer: t("pricing.faq.cancel.answer"),
    },
    {
      question: t("pricing.faq.limits.question"),
      answer: t("pricing.faq.limits.answer"),
    },
  ];

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6 space-y-8">
      <PageBreadcrumb items={[{ label: t("pricing.title") }]} />

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t("pricing.title")}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("pricing.subtitle")}
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label
          htmlFor="billing-toggle"
          className={billingPeriod === "monthly" ? "font-semibold" : "text-muted-foreground"}
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
            className={billingPeriod === "yearly" ? "font-semibold" : "text-muted-foreground"}
          >
            {t("pricing.yearly")}
          </Label>
          <Badge variant="secondary" className="bg-success/10 text-success">
            {t("pricing.yearlyDiscount")}
          </Badge>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans?.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlanSlug === plan.slug}
            isPopular={plan.slug === "profissional"}
            onSelect={handleSelectPlan}
            billingPeriod={billingPeriod}
          />
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto pt-12">
        <h2 className="text-2xl font-bold text-center mb-6">{t("pricing.faqTitle")}</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
