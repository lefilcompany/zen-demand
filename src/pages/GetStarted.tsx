import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { usePlans, Plan } from "@/hooks/usePlans";
import { PlanCard } from "@/components/PlanCard";
import { useCreateTeam, generateAccessCode } from "@/hooks/useTeams";
import { useCreateCheckout } from "@/hooks/useCheckout";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const { t } = useTranslation();
  const steps = [
    t("getStarted.step1"),
    t("getStarted.step2"),
    t("getStarted.step3"),
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.slice(0, totalSteps).map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-all ${
                  isCompleted
                    ? "border-success bg-success text-white"
                    : isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {step}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 sm:w-12 ${
                  isCompleted ? "bg-success" : "bg-muted-foreground/30"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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

  // Auth form state
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Team data state
  const [teamData, setTeamData] = useState({
    name: "",
    description: "",
    accessCode: generateAccessCode(),
  });

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      await signIn(loginData.email, loginData.password);
      toast.success(t("toast.success"), { description: t("auth.welcomeBack") });
      setStep(3);
    } catch (error: any) {
      toast.error(t("toast.error"), {
        description: error?.message || t("getStarted.authError"),
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
      toast.warning(t("toast.warning"), { description: t("profile.newPassword") });
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.warning(t("toast.warning"), { description: t("profile.passwordMismatch") });
      return;
    }
    if (!signupData.fullName.trim()) {
      toast.warning(t("toast.warning"), { description: t("auth.fullName") });
      return;
    }
    setIsAuthLoading(true);
    try {
      await signUp(signupData.email, signupData.password, signupData.fullName);
      toast.success(t("toast.success"), { description: t("getStarted.accountCreated") });
      setStep(3);
    } catch (error: any) {
      toast.error(t("toast.error"), {
        description: error?.message || t("getStarted.authError"),
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleFinishAndPay = async () => {
    if (!selectedPlan || !teamData.name.trim()) {
      toast.warning(t("toast.warning"), { description: t("createTeam.nameRequired") });
      return;
    }

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
    } catch (error: any) {
      console.error("Error in checkout flow:", error);
      toast.error(t("toast.error"), {
        description: error?.message || t("getStarted.checkoutError"),
      });
      setIsProcessing(false);
    }
  };

  if (authLoading || plansLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Left side - Branding */}
      <div
        className="hidden lg:flex lg:w-2/5 h-full relative overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          <img src={logoSomaDark} alt="SoMA" className="h-12 w-auto self-start" />
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-6 leading-tight">{t("getStarted.heroTitle")}</h1>
            <p className="text-lg text-white/90 leading-relaxed">{t("getStarted.heroSubtitle")}</p>
          </div>
          <div className="flex items-center gap-3 text-white/80">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm">{t("getStarted.securePayment")}</span>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div
        className="lg:hidden relative h-32 flex-shrink-0 overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6">
          <img src={logoSomaDark} alt="SoMA" className="h-10 w-auto mb-2" />
          <h2 className="text-lg font-semibold">{t("getStarted.title")}</h2>
        </div>
      </div>

      {/* Right side - Content */}
      <div className="flex-1 lg:w-3/5 flex flex-col bg-background overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-4xl">
            <StepIndicator currentStep={step} totalSteps={3} />

            {/* Step 1: Plan Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">{t("getStarted.step1")}</h2>
                  <p className="text-muted-foreground">{t("getStarted.selectPlanSubtitle")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {plans?.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isPopular={plan.slug === "profissional"}
                      onSelect={handlePlanSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Authentication */}
            {step === 2 && !user && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">{t("getStarted.step2")}</h2>
                  <p className="text-muted-foreground">{t("getStarted.authSubtitle")}</p>
                </div>

                {/* Selected plan summary */}
                {selectedPlan && (
                  <Card className="bg-muted/30 mb-6">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{selectedPlan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {(selectedPlan.price_cents / 100).toFixed(2)}/{t("pricing.month")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                        {t("common.edit")}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "signup")}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
                    <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">{t("auth.fullName")}</Label>
                        <Input
                          id="signup-name"
                          placeholder={t("auth.fullName")}
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">{t("common.email")}</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">{t("common.password")}</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">{t("auth.confirmPassword")}</Label>
                        <div className="relative">
                          <Input
                            id="signup-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={signupData.confirmPassword}
                            onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isAuthLoading}>
                        {isAuthLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("common.loading")}
                          </>
                        ) : (
                          <>
                            {t("auth.createAccount")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">{t("common.email")}</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">{t("common.password")}</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isAuthLoading}>
                        {isAuthLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("common.loading")}
                          </>
                        ) : (
                          <>
                            {t("auth.login")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("getStarted.backToPlans")}
                </Button>
              </div>
            )}

            {/* Step 3: Team Setup */}
            {step === 3 && user && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">{t("getStarted.step3")}</h2>
                  <p className="text-muted-foreground">{t("getStarted.teamSubtitle")}</p>
                </div>

                {/* Selected plan summary */}
                {selectedPlan && (
                  <Card className="bg-muted/30 mb-6">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{selectedPlan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {(selectedPlan.price_cents / 100).toFixed(2)}/{t("pricing.month")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                        {t("common.edit")}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>{t("getStarted.teamInfo")}</CardTitle>
                    <CardDescription>{t("createTeam.formDescription")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">{t("createTeam.teamName")} *</Label>
                      <Input
                        id="team-name"
                        placeholder={t("createTeam.teamNamePlaceholder")}
                        value={teamData.name}
                        onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-description">{t("common.description")}</Label>
                      <Textarea
                        id="team-description"
                        placeholder={t("createTeam.descriptionPlaceholder")}
                        value={teamData.description}
                        onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("createTeam.accessCode")}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={teamData.accessCode}
                          readOnly
                          className="font-mono bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTeamData({ ...teamData, accessCode: generateAccessCode() })}
                        >
                          {t("createTeam.generateNew")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("createTeam.accessCodeHint")}</p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleFinishAndPay}
                  disabled={isProcessing || !teamData.name.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("getStarted.processingCheckout")}
                    </>
                  ) : (
                    <>
                      {t("getStarted.finishAndPay")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("getStarted.backToPlans")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
