import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { usePlans, Plan } from "@/hooks/usePlans";
import { useCreateTeam } from "@/hooks/useTeams";
import { useCreateCheckout } from "@/hooks/useCheckout";
import { StepIndicator } from "@/components/get-started/StepIndicator";
import { GetStartedHero } from "@/components/get-started/GetStartedHero";
import { PlanSelectionStep } from "@/components/get-started/PlanSelectionStep";
import { AuthStep } from "@/components/get-started/AuthStep";
import { ConfirmStep } from "@/components/get-started/ConfirmStep";

export default function GetStarted() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const createTeam = useCreateTeam();
  const createCheckout = useCreateCheckout();

  // Multi-step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pre-select plan from query param
  const preSelectedPlanSlug = searchParams.get("plan");
  useEffect(() => {
    if (preSelectedPlanSlug && plans && !selectedPlan) {
      const plan = plans.find((p) => p.slug === preSelectedPlanSlug);
      if (plan) {
        setSelectedPlan(plan);
        setStep(user ? 3 : 2);
      }
    }
  }, [preSelectedPlanSlug, plans, user, selectedPlan]);

  // Skip auth step if user is already logged in
  useEffect(() => {
    if (user && step === 2) {
      setStep(3);
    }
  }, [user, step]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    if (user) {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleLoginSuccess = () => {
    toast.success(t("toast.success"), { description: t("auth.welcomeBack") });
    setStep(3);
  };

  const handleSignupSuccess = () => {
    toast.success(t("toast.success"), { description: t("getStarted.accountCreated") });
    setStep(3);
  };

  const handleFinishAndPay = async (teamData: { name: string; description: string; accessCode: string }) => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      // 1. Create team
      const team = await createTeam.mutateAsync({
        name: teamData.name,
        description: teamData.description,
        accessCode: teamData.accessCode,
      });

      // 2. Create checkout session
      const checkoutUrl = await createCheckout.mutateAsync({
        planSlug: selectedPlan.slug,
        teamId: team.id,
      });

      // 3. Redirect to Stripe
      window.location.href = checkoutUrl;
    } catch (error: unknown) {
      console.error("Error in checkout flow:", error);
      const errorMessage = error instanceof Error ? error.message : t("getStarted.checkoutError");
      toast.error(t("toast.error"), { description: errorMessage });
      setIsProcessing(false);
    }
  };

  // Loading state
  if (authLoading || plansLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
            <Loader2 className="h-12 w-12 animate-spin text-primary absolute inset-0" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Left side - Hero/Branding */}
      <GetStartedHero />

      {/* Right side - Content */}
      <div className="flex-1 lg:w-3/5 xl:w-[55%] flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className={`flex flex-col items-center p-4 sm:p-6 lg:p-6 xl:p-8 min-h-full ${step !== 1 ? "justify-center" : "justify-start pt-6"}`}>
            <div className="w-full max-w-5xl">
              {/* Step indicator */}
              <StepIndicator currentStep={step} totalSteps={3} />

              {/* Step 1: Plan Selection */}
              {step === 1 && (
                <PlanSelectionStep 
                  plans={plans} 
                  onSelectPlan={handlePlanSelect} 
                />
              )}

              {/* Step 2: Authentication */}
              {step === 2 && !user && (
                <AuthStep
                  selectedPlan={selectedPlan}
                  onBack={() => setStep(1)}
                  onLoginSuccess={handleLoginSuccess}
                  onSignupSuccess={handleSignupSuccess}
                  signIn={signIn}
                  signUp={signUp}
                />
              )}

              {/* Step 3: Confirm & Pay */}
              {step === 3 && user && (
                <ConfirmStep
                  selectedPlan={selectedPlan}
                  onBack={() => setStep(1)}
                  onFinish={handleFinishAndPay}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 py-3 px-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SoMA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
