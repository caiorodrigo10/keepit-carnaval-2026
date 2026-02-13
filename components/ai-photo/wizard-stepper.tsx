"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "templates", label: "Modelo" },
  { key: "upload", label: "Fotos" },
  { key: "generating", label: "Gerando" },
  { key: "results", label: "Resultado" },
] as const;

export type WizardStep = (typeof STEPS)[number]["key"];

interface WizardStepperProps {
  currentStep: WizardStep;
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between px-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  isCompleted && "bg-keepit-brand text-white",
                  isCurrent && "bg-keepit-brand text-white ring-2 ring-keepit-brand/30 ring-offset-2 ring-offset-white",
                  !isCompleted && !isCurrent && "bg-keepit-dark/10 text-keepit-dark/40"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isCurrent ? "text-keepit-brand" : isCompleted ? "text-keepit-dark" : "text-keepit-dark/40"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-18px] transition-colors",
                  index < currentIndex ? "bg-keepit-brand" : "bg-keepit-dark/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
