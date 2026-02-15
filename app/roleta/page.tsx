"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { PartyPopper, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SharedHeader } from "@/components/shared-header";

// Prize config (client-side — no probabilities exposed)
const PRIZES = [
  { slug: "carregador",        name: "Carregador Portátil",  color: "#34BF58", emoji: "🔋" },
  { slug: "capa-chuva",        name: "Capa de Chuva",        color: "#4ECDC4", emoji: "🌧️" },
  { slug: "energy-now",        name: "Energy Now",           color: "#FFD700", emoji: "⚡" },
  { slug: "kit-glitter",       name: "Kit Glitter",          color: "#FF69B4", emoji: "✨" },
  { slug: "alcool-gel",        name: "Álcool Gel",           color: "#66FB95", emoji: "🧴" },
  { slug: "rexona",            name: "Rexona Clinical",      color: "#5B9BD5", emoji: "🧊" },
  { slug: "kit-camisinha",     name: "Kit c/ Óculos",        color: "#FF6B6B", emoji: "🕶️" },
  { slug: "hype-glow",         name: "Hype Glow Rosto",     color: "#E040FB", emoji: "💎" },
  { slug: "hidratante-labial", name: "Nivea Lip Balm",       color: "#1E88E5", emoji: "💋" },
  { slug: "glitter-corporal",  name: "Glitter Corporal",     color: "#AB47BC", emoji: "🌟" },
  { slug: "arquinho",          name: "Arquinho Colorido",    color: "#FF7043", emoji: "🎀" },
  { slug: "prendedor",         name: "Prendedor Cabelo",     color: "#8D6E63", emoji: "💇" },
  { slug: "orelha-brilhosa",   name: "Orelha Brilhosa",     color: "#FFC107", emoji: "👂" },
];

type PageState = "register" | "slot" | "spinning" | "result";

interface SpinResult {
  slug: string;
  name: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/* ─── Slot Reel ─── */
const CELL_H = 72;

function SlotReel({
  winnerSlug,
  duration,
  spinning,
  spinKey,
}: {
  winnerSlug: string;
  duration: number;
  spinning: boolean;
  spinKey: number;
}) {
  const winIdx = Math.max(0, PRIZES.findIndex((p) => p.slug === winnerSlug));

  const strip = useMemo(() => {
    const items: typeof PRIZES = [];
    // 3 random items visible initially
    for (let i = 0; i < 3; i++) {
      items.push(PRIZES[Math.floor(Math.random() * PRIZES.length)]);
    }
    // 3-4 full shuffled cycles
    const cycles = 3 + Math.floor(Math.random() * 2);
    for (let c = 0; c < cycles; c++) {
      const shuffled = [...PRIZES].sort(() => Math.random() - 0.5);
      items.push(...shuffled);
    }
    // Final 3 visible: prev → WINNER → next
    const prev = (winIdx - 1 + PRIZES.length) % PRIZES.length;
    const next = (winIdx + 1) % PRIZES.length;
    items.push(PRIZES[prev]);
    items.push(PRIZES[winIdx]);
    items.push(PRIZES[next]);
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winIdx, spinKey]);

  // Center the winner (second-to-last item) in viewport
  const finalY = -(strip.length - 2) * CELL_H + CELL_H;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white border-2 border-keepit-dark/10"
      style={{ height: CELL_H * 3 }}
    >
      {/* Fade gradient top/bottom */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(248,250,249,0.95) 0%, transparent 30%, transparent 70%, rgba(248,250,249,0.95) 100%)",
        }}
      />
      {/* Center highlight */}
      <div
        className="absolute left-0 right-0 z-[5] border-y-2 border-keepit-brand/40 bg-keepit-brand/5"
        style={{ top: CELL_H, height: CELL_H }}
      />

      <motion.div
        key={spinKey}
        initial={{ y: 0 }}
        animate={{ y: spinning ? finalY : 0 }}
        transition={
          spinning
            ? { duration, ease: [0.06, 0.6, 0.12, 1] }
            : { duration: 0 }
        }
      >
        {strip.map((prize, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ height: CELL_H }}
          >
            <span className="text-[2rem] select-none">{prize.emoji}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Flashing lights around the machine ─── */
function SlotLights({ active }: { active: boolean }) {
  return (
    <div className="absolute -inset-3 z-0 pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * 360;
        const rad = (angle * Math.PI) / 180;
        const x = 50 + 50 * Math.cos(rad);
        const y = 50 + 50 * Math.sin(rad);
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              backgroundColor: i % 2 === 0 ? "#34BF58" : "#FFD700",
            }}
            animate={
              active
                ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }
                : { opacity: 0.2, scale: 0.8 }
            }
            transition={
              active
                ? { duration: 0.6, repeat: Infinity, delay: i * 0.05 }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
export default function RoletaPage() {
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

  // Slot
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [isCallingApi, setIsCallingApi] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Register
  const handleRegister = useCallback(async () => {
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Nome deve ter pelo menos 3 caracteres");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email inválido");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Telefone inválido (inclua o DDD)");
      return;
    }
    if (!lgpd) {
      toast.error("Você precisa aceitar os termos");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/roleta/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: cleanPhone, lgpd_consent: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao cadastrar");
        return;
      }

      setLeadId(data.lead_id);
      setLeadName(data.name);

      if (data.already_spun) {
        setResult(data.prize);
        setState("result");
      } else {
        setState("slot");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, phone, lgpd]);

  // Play slot
  const handlePlay = useCallback(async () => {
    if (!leadId) return;

    setIsCallingApi(true);
    try {
      const res = await fetch("/api/roleta/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao jogar");
        setIsCallingApi(false);
        return;
      }

      const prize = data.prize as SpinResult;
      setResult(prize);
      setSpinKey((k) => k + 1);
      setState("spinning");
      setIsCallingApi(false);

      // Show result after reels stop (longest reel = ~3.8s)
      timerRef.current = setTimeout(() => {
        setState("result");
      }, 4200);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
      setIsCallingApi(false);
    }
  }, [leadId]);

  // Get winning prize for display
  const winningPrize = result ? PRIZES.find((p) => p.slug === result.slug) : null;
  const winnerSlug = result?.slug || PRIZES[0].slug;

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Toaster position="top-center" />

      <SharedHeader title="Prêmios" badge="Carnaval 2026" showBack={false} />

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
                  <Gift className="w-8 h-8 text-keepit-brand" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-keepit-dark">Preencha seus dados</h2>
                <p className="text-keepit-dark/50 text-sm mt-1">para concorrer a prêmios</p>
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
                  Concordo com os termos de uso e política de privacidade. Meus dados serão usados exclusivamente para esta promoção.
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
                  "Participar"
                )}
              </Button>
            </motion.div>
          )}

          {/* SLOT MACHINE */}
          {(state === "slot" || state === "spinning") && (
            <motion.div
              key="slot"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm flex flex-col items-center gap-5"
            >
              <p className="text-lg font-black text-keepit-dark">
                Olá, <span className="text-keepit-brand">{leadName.split(" ")[0]}</span>!
              </p>

              {/* Slot machine frame */}
              <div className="relative w-full">
                <SlotLights active={state === "spinning"} />

                <div className="relative z-[1] rounded-3xl bg-keepit-dark p-4 shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
                  {/* Header */}
                  <div className="text-center mb-3">
                    <span className="text-2xl">🎰</span>
                    <h3 className="text-sm font-black text-white/90 tracking-wider uppercase">
                      Caça-Níquel de Prêmios
                    </h3>
                  </div>

                  {/* 3 Reels */}
                  <div className="grid grid-cols-3 gap-2">
                    <SlotReel
                      winnerSlug={winnerSlug}
                      duration={2.5}
                      spinning={state === "spinning"}
                      spinKey={spinKey}
                    />
                    <SlotReel
                      winnerSlug={winnerSlug}
                      duration={3.2}
                      spinning={state === "spinning"}
                      spinKey={spinKey}
                    />
                    <SlotReel
                      winnerSlug={winnerSlug}
                      duration={3.8}
                      spinning={state === "spinning"}
                      spinKey={spinKey}
                    />
                  </div>

                  {/* Bottom decoration */}
                  <div className="flex justify-center gap-1 mt-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-keepit-brand/60"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Play button */}
              <Button
                onClick={handlePlay}
                disabled={state === "spinning" || isCallingApi}
                className="btn-pill btn-pill-primary w-52 h-14 text-lg font-black shadow-[0_4px_20px_rgba(52,191,88,0.3)]"
              >
                {state === "spinning" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isCallingApi ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  "🎰 JOGAR!"
                )}
              </Button>
            </motion.div>
          )}

          {/* RESULT */}
          {state === "result" && winningPrize && (
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
                <h2 className="text-2xl font-black text-keepit-dark">Parabéns!</h2>
                <p className="text-keepit-dark/50 mt-1">Você ganhou:</p>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="card-keepit p-6 w-full"
                style={{ backgroundColor: `${winningPrize.color}15`, border: `2px solid ${winningPrize.color}30` }}
              >
                <span className="text-5xl block mb-3">{winningPrize.emoji}</span>
                <h3 className="text-2xl font-black" style={{ color: winningPrize.color }}>
                  {winningPrize.name}
                </h3>
              </motion.div>

              <div className="card-keepit p-4 w-full">
                <p className="text-sm text-keepit-dark/70">
                  Mostre esta tela para nossa equipe no stand para retirar seu brinde!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
