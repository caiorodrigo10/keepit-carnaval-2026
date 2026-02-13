"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WizardStepper, type WizardStep } from "./wizard-stepper";
import { AI_PHOTO_LIMITS } from "@/types/ai-photo";

interface WizardHeaderProps {
  currentStep: WizardStep;
  remainingGenerations: number;
  onBack: () => void;
  showBack?: boolean;
}

export function WizardHeader({
  currentStep,
  remainingGenerations,
  onBack,
  showBack = true,
}: WizardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              className="text-keepit-dark/60 hover:text-keepit-dark"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="text-xl font-black tracking-tighter text-keepit-dark">
            KEEPIT
          </span>
          <span className="text-keepit-dark/20 font-light">|</span>
          <span className="text-sm font-medium text-keepit-dark/60">
            Foto com IA
          </span>
        </div>
        <Badge variant="outline" className="border-keepit-emerald/30 text-keepit-emerald">
          {remainingGenerations}/{AI_PHOTO_LIMITS.MAX_GENERATIONS_PER_LEAD}
        </Badge>
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-3">
        <WizardStepper currentStep={currentStep} />
      </div>
    </header>
  );
}
