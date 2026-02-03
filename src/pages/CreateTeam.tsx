import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTeam, generateAccessCode, checkAccessCodeAvailable } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { ArrowLeft, RefreshCw, Copy, Check, Eye, EyeOff, Users, Loader2, Shield, CheckCircle2, XCircle, Loader, ArrowRight, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { useTranslation } from "react-i18next";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";
import { usePlans, Plan } from "@/hooks/usePlans";
import { PlanCard } from "@/components/PlanCard";
import { useCreateCheckout } from "@/hooks/useCheckout";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: 1 | 2;
  onStepClick: (step: 1 | 2) => void;
  canGoToStep2: boolean;
}

function StepIndicator({ currentStep, onStepClick, canGoToStep2 }: StepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {/* Step 1 */}
      <button
        type="button"
        onClick={() => onStepClick(1)}
        className="flex items-center gap-2 focus:outline-none"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
            currentStep >= 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
        </div>
        <span
          className={cn(
            "text-sm font-medium hidden sm:inline",
            currentStep >= 1 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {t("createTeam.step1")}
        </span>
      </button>

      {/* Connector */}
      <div className={cn(
        "w-12 h-0.5 transition-all",
        currentStep >= 2 ? "bg-primary" : "bg-muted"
      )} />

      {/* Step 2 */}
      <button
        type="button"
        onClick={() => canGoToStep2 && onStepClick(2)}
        disabled={!canGoToStep2}
        className={cn(
          "flex items-center gap-2 focus:outline-none",
          !canGoToStep2 && "cursor-not-allowed opacity-50"
        )}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
            currentStep >= 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          2
        </div>
        <span
          className={cn(
            "text-sm font-medium hidden sm:inline",
            currentStep >= 2 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {t("createTeam.step2")}
        </span>
      </button>
    </div>
  );
}

export default function CreateTeam() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSelectedTeamId } = useSelectedTeam();
  const createTeam = useCreateTeam();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const createCheckout = useCreateCheckout();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessCode, setAccessCode] = useState(() => generateAccessCode());
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCodeAvailable, setIsCodeAvailable] = useState<boolean | null>(null);
  
  // Checkout state
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check code availability when it changes
  useEffect(() => {
    if (accessCode.length < 6) {
      setIsCodeAvailable(null);
      return;
    }

    const checkCode = async () => {
      setIsCheckingCode(true);
      try {
        const available = await checkAccessCodeAvailable(accessCode);
        setIsCodeAvailable(available);
      } catch (error) {
        console.error("Error checking code:", error);
        setIsCodeAvailable(null);
      } finally {
        setIsCheckingCode(false);
      }
    };

    const timeoutId = setTimeout(checkCode, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [accessCode]);

  const getCodeStrength = (code: string) => {
    if (code.length < 6) return { level: 0, label: t("createTeam.codeStrength.veryWeak"), color: "bg-destructive" };
    
    const hasLetters = /[A-Z]/.test(code);
    const hasNumbers = /[0-9]/.test(code);
    const isMixed = hasLetters && hasNumbers;
    
    if (code.length >= 18 && isMixed) return { level: 4, label: t("createTeam.codeStrength.excellent"), color: "bg-emerald-500" };
    if (code.length >= 14 && isMixed) return { level: 3, label: t("createTeam.codeStrength.strong"), color: "bg-emerald-400" };
    if (code.length >= 10 && isMixed) return { level: 2, label: t("createTeam.codeStrength.good"), color: "bg-amber-500" };
    if (code.length >= 6) return { level: 1, label: t("createTeam.codeStrength.weak"), color: "bg-amber-400" };
    
    return { level: 0, label: t("createTeam.codeStrength.veryWeak"), color: "bg-destructive" };
  };

  const codeStrength = getCodeStrength(accessCode);

  const handleGenerateCode = () => {
    const newCode = generateAccessCode();
    setAccessCode(newCode);
    setIsCodeAvailable(null);
    toast.info(t("createTeam.newCodeGenerated"));
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(accessCode);
    setCopied(true);
    toast.success(t("createTeam.codeCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    setAccessCode(value);
    setIsCodeAvailable(null);
  };

  const isStep1Valid = name.trim().length > 0 && accessCode.length >= 6 && accessCode.length <= 20 && isCodeAvailable === true && !isCheckingCode;

  const handleContinueToPlans = () => {
    if (!isStep1Valid) return;
    setStep(2);
  };

  const handlePlanSelect = async (plan: Plan) => {
    if (isProcessing) return;
    
    setSelectedPlanSlug(plan.slug);
    setIsProcessing(true);

    try {
      // Step 1: Create the team
      const team = await new Promise<any>((resolve, reject) => {
        createTeam.mutate(
          {
            name: name.trim(),
            description: description.trim() || undefined,
            accessCode: accessCode,
          },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      // Step 2: Create checkout session
      const checkoutUrl = await createCheckout.mutateAsync({
        planSlug: plan.slug,
        teamId: team.id,
      });

      // Step 3: Redirect to Stripe
      setSelectedTeamId(team.id);
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error("Error in team creation/checkout flow:", error);
      
      if (error.code === "23505") {
        toast.error(t("createTeam.codeAlreadyUsed"), {
          description: t("createTeam.generateNewCode"),
        });
        setStep(1);
      } else if (error.message?.includes("checkout")) {
        // Team was created but checkout failed
        toast.error(t("createTeam.checkoutFailed"), {
          description: t("createTeam.teamCreatedButCheckoutFailed"),
        });
      } else {
        toast.error(t("toast.error"), {
          description: getErrorMessage(error),
        });
      }
    } finally {
      setIsProcessing(false);
      setSelectedPlanSlug(null);
    }
  };

  const handleStepClick = (targetStep: 1 | 2) => {
    if (targetStep === 2 && !isStep1Valid) return;
    setStep(targetStep);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Mobile/Tablet Header with Image */}
      <div 
        className="lg:hidden relative h-40 sm:h-48 overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-8 sm:h-10 w-auto mb-2" />
          <h2 className="text-lg font-semibold">
            {step === 1 ? t("createTeam.titleStep1") : t("createTeam.titleStep2")}
          </h2>
        </div>
      </div>

      {/* Desktop Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img src={logoSomaDark} alt="SoMA" className="h-12 w-auto" />
          </div>
          <div className="max-w-md">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur mb-6">
              {step === 1 ? <Users className="h-8 w-8" /> : <CreditCard className="h-8 w-8" />}
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              {step === 1 ? t("createTeam.heroTitle") : t("createTeam.heroTitleStep2")}
            </h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              {step === 1 ? t("createTeam.heroSubtitle") : t("createTeam.heroSubtitleStep2")}
            </p>
          </div>
          <div className="text-white/60 text-sm">
            {step === 1 ? t("createTeam.codeHint") : t("createTeam.planHint")}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-start lg:items-center justify-center p-6 sm:p-8 md:p-12 bg-background overflow-y-auto">
        <div className={cn("w-full", step === 2 ? "max-w-4xl" : "max-w-md")}>
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step === 1 ? navigate("/welcome") : setStep(1)}
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {step === 1 ? t("common.back") : t("createTeam.backToDetails")}
          </Button>

          {/* Step Indicator */}
          <StepIndicator 
            currentStep={step} 
            onStepClick={handleStepClick}
            canGoToStep2={isStep1Valid}
          />

          {/* Step 1: Team Details */}
          {step === 1 && (
            <>
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {t("createTeam.formTitle")}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t("createTeam.formSubtitle")}
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleContinueToPlans(); }} className="space-y-5">
                {/* Team Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-medium">
                    {t("teams.teamName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder={t("createTeam.teamNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 bg-muted/50 border-2 focus:border-primary transition-colors"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-medium">
                    {t("common.description")}
                    <span className="text-muted-foreground font-normal ml-1">({t("createTeam.optional")})</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t("createTeam.descriptionPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none bg-muted/50 border-2 focus:border-primary transition-colors"
                  />
                </div>

                {/* Access Code Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label htmlFor="accessCode" className="text-base font-medium">
                      {t("teams.accessCode")}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground -mt-1">
                    {t("teams.accessCodeHint")}
                  </p>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="accessCode"
                        type={showCode ? "text" : "password"}
                        value={accessCode}
                        onChange={handleAccessCodeChange}
                        placeholder="ABCDEFGH1234567890XY"
                        className={`h-12 text-base font-mono tracking-[0.1em] uppercase text-center bg-muted/50 border-2 transition-colors pr-14 ${
                          isCodeAvailable === false ? 'border-destructive focus:border-destructive' : 
                          isCodeAvailable === true ? 'border-emerald-500 focus:border-emerald-500' : 
                          'focus:border-primary'
                        }`}
                        maxLength={20}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                        {accessCode.length}/20
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCode(!showCode)}
                      className="h-12 w-12 flex-shrink-0"
                      title={showCode ? t("createTeam.hide") : t("createTeam.show")}
                    >
                      {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Code availability indicator */}
                  {accessCode.length >= 6 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {isCheckingCode ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-muted-foreground">{t("createTeam.checkingAvailability")}</span>
                          </>
                        ) : isCodeAvailable === true ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-emerald-500">{t("createTeam.codeAvailable")}</span>
                          </>
                        ) : isCodeAvailable === false ? (
                          <>
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">{t("createTeam.codeUnavailable")}</span>
                          </>
                        ) : null}
                      </div>
                      
                      {/* Suggestions when code is taken */}
                      {isCodeAvailable === false && (
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3].map((i) => {
                            const suggestion = generateAccessCode();
                            return (
                              <Button
                                key={i}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="font-mono text-xs"
                                onClick={() => setAccessCode(suggestion)}
                              >
                                {suggestion.slice(0, 8)}...
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t("createTeam.generateNew")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500" />
                          {t("createTeam.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          {t("createTeam.copy")}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Strength Indicator */}
                  {accessCode.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("createTeam.codeStrengthLabel")}</span>
                        <span className={`font-medium ${codeStrength.level >= 3 ? 'text-emerald-500' : codeStrength.level >= 2 ? 'text-amber-500' : 'text-destructive'}`}>
                          {codeStrength.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= codeStrength.level ? codeStrength.color : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {accessCode.length > 0 && accessCode.length < 6 && (
                    <p className="text-sm text-destructive">
                      {t("createTeam.minCodeLength")}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/welcome")}
                    className="flex-1 h-12"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isStep1Valid}
                    className="flex-1 h-12 gap-2"
                  >
                    {t("createTeam.continueToPlans")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Select Plan */}
          {step === 2 && (
            <>
              <div className="mb-6 sm:mb-8 text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {t("createTeam.selectPlanTitle")}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t("createTeam.selectPlanSubtitle")}
                </p>
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {plans?.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isPopular={plan.slug === "profissional"}
                      onSelect={handlePlanSelect}
                      isLoading={isProcessing && selectedPlanSlug === plan.slug}
                    />
                  ))}
                </div>
              )}

              {isProcessing && (
                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t("createTeam.creatingTeam")}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
