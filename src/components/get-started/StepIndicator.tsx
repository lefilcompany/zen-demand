import { useTranslation } from "react-i18next";
import { Check, User, CreditCard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const { t } = useTranslation();
  
  const steps = [
    { label: t("getStarted.step1"), icon: CreditCard },
    { label: t("getStarted.step2"), icon: User },
    { label: t("getStarted.step3"), icon: Users },
  ];

  return (
    <div className="relative flex items-center justify-center mb-10">
      {/* Background connector line */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 h-0.5 bg-muted w-[calc(100%-120px)] max-w-md hidden sm:block" />
      
      <div className="relative flex items-center justify-between w-full max-w-md sm:max-w-lg">
        {steps.slice(0, totalSteps).map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const Icon = step.icon;

          return (
            <div key={index} className="flex flex-col items-center z-10">
              {/* Step circle */}
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 font-semibold",
                  isCompleted && "bg-success text-success-foreground shadow-lg shadow-success/30",
                  isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                
                {/* Active pulse animation */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                )}
              </div>
              
              {/* Step label */}
              <span 
                className={cn(
                  "mt-3 text-xs font-medium text-center transition-colors max-w-[80px]",
                  isActive && "text-primary font-semibold",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
