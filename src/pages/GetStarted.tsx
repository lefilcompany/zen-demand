import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { usePlans, Plan } from "@/hooks/usePlans";
import { useCreateTeam } from "@/hooks/useTeams";
import { useCreateCheckout } from "@/hooks/useCheckout";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { StepIndicator } from "@/components/get-started/StepIndicator";
import { GetStartedHero } from "@/components/get-started/GetStartedHero";
import { PlanSelectionStep } from "@/components/get-started/PlanSelectionStep";
import { AuthStep } from "@/components/get-started/AuthStep";
import { ConfirmStep } from "@/components/get-started/ConfirmStep";
import { TeamStep } from "@/components/get-started/TeamStep";

export default function GetStarted() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: userSub, isLoading: subLoading } = useUserSubscription();
  const createTeam = useCreateTeam();
  const createCheckout = useCreateCheckout();

  const currentPlanSlug = userSub?.subscription?.plan?.slug ?? null;
  const existingTeamId = userSub?.teamId ?? null;

  // Multi-step state: 1=Team, 2=Plan, 3=Confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [teamData, setTeamData] = useState<{ name: string; description: string; accessCode: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Pre-select plan from query param
  const preSelectedPlanSlug = searchParams.get("plan");
  useEffect(() => {
    if (preSelectedPlanSlug && plans && !selectedPlan) {
      const plan = plans.find((p) => p.slug === preSelectedPlanSlug);
      if (plan) {
        setSelectedPlan(plan);
        // If user is logged in and has existing team (upgrade flow), jump to confirm
        if (user && existingTeamId) {
          setStep(3);
        } else if (user) {
          // User logged in but no team - start at team step
          setStep(1);
        }
      }
    }
  }, [preSelectedPlanSlug, plans, user, selectedPlan, existingTeamId]);

  // If user has existing team (upgrade flow), skip team step and go to plan
  useEffect(() => {
    if (user && existingTeamId && step === 1) {
      setStep(2);
    }
  }, [user, existingTeamId, step]);

  // Handle team step next - check auth first
  const handleTeamNext = (data: { name: string; description: string; accessCode: string }) => {
    setTeamData(data);
    if (!user) {
      setShowAuth(true);
    } else {
      setStep(2);
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep(3);
  };

  // Direct auth functions that do NOT navigate away
  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/get-started`,
        data: { full_name: fullName },
      },
    });
    if (error) throw error;
  };

  const handleLoginSuccess = () => {
    toast.success(t("toast.success"), { description: t("auth.welcomeBack") });
    setShowAuth(false);
    setStep(2);
  };

  const handleSignupSuccess = () => {
    toast.success(t("toast.success"), { description: t("getStarted.accountCreated") });
    setShowAuth(false);
    setStep(2);
  };

  // When user becomes authenticated while auth is shown, move to plan step
  useEffect(() => {
    if (user && showAuth) {
      setShowAuth(false);
      setStep(2);
    }
  }, [user, showAuth]);

  const handleFinishAndPay = async (finalTeamData: { name: string; description: string; accessCode: string }) => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      let teamId: string;

      // If user already has a team, reuse it for upgrade
      if (existingTeamId) {
        teamId = existingTeamId;
        console.log("[GetStarted] Using existing team:", teamId);
      } else {
        // Create new team
        console.log("[GetStarted] Creating new team:", finalTeamData.name);
        const team = await createTeam.mutateAsync({
          name: finalTeamData.name,
          description: finalTeamData.description,
          accessCode: finalTeamData.accessCode,
        });
        teamId = team.id;
        console.log("[GetStarted] Team created:", teamId);
      }

      // Create checkout session
      console.log("[GetStarted] Creating checkout for plan:", selectedPlan.slug, "team:", teamId);
      const checkoutUrl = await createCheckout.mutateAsync({
        planSlug: selectedPlan.slug,
        teamId,
      });

      console.log("[GetStarted] Redirecting to Stripe checkout");
      // Redirect to Stripe
      window.location.href = checkoutUrl;
    } catch (error: unknown) {
      console.error("[GetStarted] Error in checkout flow:", error);
      const errorMessage = error instanceof Error ? error.message : t("getStarted.checkoutError");
      toast.error(t("toast.error"), { description: errorMessage });
      setIsProcessing(false);
    }
  };

  // Loading state
  if (authLoading || plansLoading || (user && subLoading)) {
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

  // Determine which content to show
  const renderContent = () => {
    // Show auth interstitial if needed (user filled team data but not logged in)
    if (showAuth && !user) {
      return (
        <AuthStep
          selectedPlan={null}
          onBack={() => {
            setShowAuth(false);
            setStep(1);
          }}
          onLoginSuccess={handleLoginSuccess}
          onSignupSuccess={handleSignupSuccess}
          signIn={handleSignIn}
          signUp={handleSignUp}
        />
      );
    }

    switch (step) {
      case 1:
        return (
          <TeamStep
            initialData={teamData || undefined}
            onNext={handleTeamNext}
          />
        );
      case 2:
        return (
          <PlanSelectionStep
            plans={plans}
            onSelectPlan={handlePlanSelect}
            currentPlanSlug={currentPlanSlug}
            onBack={existingTeamId ? undefined : () => setStep(1)}
          />
        );
      case 3:
        return (
          <ConfirmStep
            selectedPlan={selectedPlan}
            teamData={teamData || { name: "", description: "", accessCode: "" }}
            onBackToPlan={() => setStep(2)}
            onBackToTeam={() => setStep(1)}
            onFinish={handleFinishAndPay}
            isProcessing={isProcessing}
            currentPlanSlug={currentPlanSlug}
            existingTeamId={existingTeamId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background">
      {/* Left side - Hero/Branding */}
      <GetStartedHero />

      {/* Right side - Content */}
      <div className="flex-1 lg:w-3/5 xl:w-[55%] flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className={`flex flex-col items-center p-4 sm:p-6 lg:p-6 xl:p-8 min-h-full ${step === 2 ? "justify-start pt-6" : "justify-center"}`}>
            <div className="w-full max-w-5xl">
              {/* Step indicator - hide during auth interstitial */}
              {!showAuth && <StepIndicator currentStep={step} totalSteps={3} />}

              {renderContent()}
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
