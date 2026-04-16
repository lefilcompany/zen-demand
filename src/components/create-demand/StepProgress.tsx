import { Check, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number; // 1 (parent) + N (subdemands) + 1 (review)
  subdemandCount: number;
  stepTitles?: Record<number, string>; // index -> configured title
}

export function StepProgress({ currentStep, totalSteps, subdemandCount, stepTitles = {} }: StepProgressProps) {
  const steps: { label: string; icon?: React.ReactNode; configuredTitle?: string }[] = [
    { label: "Demanda Principal", configuredTitle: stepTitles[0] },
  ];

  for (let i = 0; i < subdemandCount; i++) {
    steps.push({ label: `Subdemanda ${i + 1}`, icon: <GitBranch className="h-3 w-3" />, configuredTitle: stepTitles[i + 1] });
  }

  steps.push({ label: "Revisão" });

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;

        return (
          <div key={idx} className="flex items-center gap-1 shrink-0">
            {idx > 0 && (
              <div className={cn("w-4 h-px", isCompleted ? "bg-primary" : "bg-border")} />
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && "bg-primary/15 text-primary",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : step.icon ? (
                step.icon
              ) : null}
              {isCompleted && step.configuredTitle ? (
                <div className="flex flex-col leading-tight">
                  <span className="max-w-[100px] truncate text-[11px] font-semibold" title={step.configuredTitle}>
                    {step.configuredTitle}
                  </span>
                  <span className="text-[9px] opacity-60 font-normal whitespace-nowrap">{step.label}</span>
                </div>
              ) : (
                <span className="whitespace-nowrap text-[11px] font-medium">{step.label}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
