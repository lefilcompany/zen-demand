import { Check, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number; // 1 (parent) + N (subdemands) + 1 (review)
  subdemandCount: number;
}

export function StepProgress({ currentStep, totalSteps, subdemandCount }: StepProgressProps) {
  const steps: { label: string; icon?: React.ReactNode }[] = [
    { label: "Demanda Principal" },
  ];

  for (let i = 0; i < subdemandCount; i++) {
    steps.push({ label: `Subdemanda ${i + 1}`, icon: <GitBranch className="h-3 w-3" /> });
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
                "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && "bg-primary/15 text-primary",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : step.icon ? (
                step.icon
              ) : null}
              <span className="whitespace-nowrap">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
