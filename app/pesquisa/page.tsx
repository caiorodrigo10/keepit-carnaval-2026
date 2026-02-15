"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { Loader2, ClipboardList, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SharedHeader } from "@/components/shared-header";
import { SURVEY_QUESTIONS, SURVEY_PRIZE } from "@/lib/pesquisa/questions";
import type { Question } from "@/lib/pesquisa/questions";

type PageState = "register" | "survey" | "submitting" | "result";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-11 h-11 rounded-full text-sm font-bold transition-all ${
              value === n
                ? "bg-keepit-brand text-white scale-110 shadow-[0_0_12px_rgba(52,191,88,0.4)]"
                : "bg-keepit-dark/5 text-keepit-dark/60 hover:bg-keepit-dark/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-keepit-dark/40 px-1">
        <span>Pessimo</span>
        <span>Excelente</span>
      </div>
    </div>
  );
}

function MultipleChoiceInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {question.options?.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
            value === opt.value
              ? "bg-keepit-brand text-white scale-105"
              : "bg-keepit-dark/5 text-keepit-dark/60 hover:bg-keepit-dark/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function PesquisaPage() {
  const [state, setState] = useState<PageState>("register");

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lead
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");

  // Survey
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  const handleRegister = useCallback(async () => {
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Nome deve ter pelo menos 3 caracteres");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email invalido");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Telefone invalido (inclua o DDD)");
      return;
    }
    if (!lgpd) {
      toast.error("Voce precisa aceitar os termos");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pesquisa/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone,
          lgpd_consent: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao cadastrar");
        return;
      }

      setLeadId(data.lead_id);
      setLeadName(data.name);

      if (data.already_answered) {
        setState("result");
      } else {
        setState("survey");
      }
    } catch {
      toast.error("Erro de conexao. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, phone, lgpd]);

  const question = SURVEY_QUESTIONS[currentQ];
  const isLastQuestion = currentQ === SURVEY_QUESTIONS.length - 1;
  const currentAnswer = question ? answers[question.id] : undefined;
  const canProceed =
    question &&
    (!question.required ||
      (currentAnswer !== undefined && currentAnswer !== "" && currentAnswer !== -1));

  const handleNext = useCallback(async () => {
    if (!canProceed && question?.required) {
      toast.error("Responda esta pergunta para continuar");
      return;
    }

    if (isLastQuestion) {
      setState("submitting");
      try {
        const res = await fetch("/api/pesquisa/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: leadId, answers }),
        });

        const data = await res.json();

        if (!res.ok && !data.already_answered) {
          toast.error(data.error || "Erro ao enviar");
          setState("survey");
          return;
        }

        setState("result");
      } catch {
        toast.error("Erro de conexao. Tente novamente.");
        setState("survey");
      }
    } else {
      setCurrentQ((prev) => prev + 1);
    }
  }, [canProceed, isLastQuestion, leadId, answers, question]);

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ((prev) => prev - 1);
  };

  const setAnswer = (value: string | number, autoAdvance = false) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (autoAdvance && !isLastQuestion) {
      setTimeout(() => setCurrentQ((prev) => prev + 1), 250);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Toaster position="top-center" />

      <SharedHeader title="Pesquisa" badge="Carnaval 2026" showBack={false} />

      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <AnimatePresence mode="wait">
          {/* REGISTER */}
          {state === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm space-y-5"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-keepit-brand/15 flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-8 h-8 text-keepit-brand" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-keepit-dark">Preencha seus dados</h2>
                <p className="text-keepit-dark/50 text-sm mt-1">
                  para participar da pesquisa
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 h-12 rounded-xl"
                />
                <Input
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 h-12 rounded-xl"
                />
                <Input
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 h-12 rounded-xl"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lgpd}
                  onChange={(e) => setLgpd(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-keepit-dark/20 accent-keepit-brand"
                />
                <span className="text-xs text-keepit-dark/50 leading-relaxed">
                  Concordo com os termos de uso e politica de privacidade. Meus
                  dados serao usados exclusivamente para esta pesquisa.
                </span>
              </label>

              <Button
                onClick={handleRegister}
                disabled={isSubmitting}
                className="btn-pill btn-pill-primary w-full h-12 text-base"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Comecar"
                )}
              </Button>
            </motion.div>
          )}

          {/* SURVEY */}
          {(state === "survey" || state === "submitting") && question && (
            <motion.div
              key={`q-${currentQ}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full max-w-sm flex flex-col items-center gap-6"
            >
              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-keepit-dark/50">
                    Pergunta {currentQ + 1} de {SURVEY_QUESTIONS.length}
                  </span>
                  <span className="text-sm text-keepit-brand font-bold">
                    {Math.round(((currentQ + 1) / SURVEY_QUESTIONS.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-keepit-dark/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-keepit-brand rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentQ + 1) / SURVEY_QUESTIONS.length) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="text-center">
                <h2 className="text-lg font-black tracking-tight leading-snug text-keepit-dark">
                  {question.text}
                </h2>
                {!question.required && (
                  <p className="text-keepit-dark/40 text-xs mt-1">(opcional)</p>
                )}
              </div>

              {/* Answer input */}
              <div className="w-full py-4">
                {question.type === "rating" && (
                  <RatingInput
                    value={currentAnswer !== undefined ? (currentAnswer as number) : -1}
                    onChange={(v) => setAnswer(v, true)}
                  />
                )}
                {question.type === "multiple_choice" && (
                  <MultipleChoiceInput
                    question={question}
                    value={(currentAnswer as string) || ""}
                    onChange={(v) => setAnswer(v, true)}
                  />
                )}
                {question.type === "text" && (
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={(currentAnswer as string) || ""}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 min-h-[100px] resize-none rounded-xl"
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 w-full">
                {currentQ > 0 && (
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-12 border-keepit-dark/15 text-keepit-dark bg-white hover:bg-keepit-dark/5 rounded-full"
                    disabled={state === "submitting"}
                  >
                    Voltar
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={
                    state === "submitting" ||
                    (question.required && !canProceed)
                  }
                  className="btn-pill btn-pill-primary flex-1 h-12 text-base"
                >
                  {state === "submitting" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isLastQuestion ? (
                    "Enviar"
                  ) : (
                    "Proximo"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {state === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              >
                <PartyPopper className="w-16 h-16 text-keepit-brand" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-black text-keepit-dark">Obrigado!</h2>
                <p className="text-keepit-dark/50 mt-1">
                  Sua opiniao e muito importante para nos
                </p>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="card-keepit p-6 w-full bg-keepit-brand/10 border-2 border-keepit-brand/20"
              >
                <span className="text-5xl block mb-3">{SURVEY_PRIZE.emoji}</span>
                <h3 className="text-2xl font-black text-keepit-brand">
                  {SURVEY_PRIZE.name}
                </h3>
              </motion.div>

              <div className="card-keepit p-4 w-full">
                <p className="text-sm text-keepit-dark/70">{SURVEY_PRIZE.description}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
