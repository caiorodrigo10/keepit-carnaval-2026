"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { PartyPopper, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SharedHeader } from "@/components/shared-header";

// Prize config (client-side copy for wheel rendering — no probabilities exposed)
const WHEEL_PRIZES = [
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

type PageState = "register" | "wheel" | "spinning" | "result";

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

  // Wheel
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

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
        setState("wheel");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, phone, lgpd]);

  // Spin
  const handleSpin = useCallback(async () => {
    if (!leadId) return;

    setState("spinning");

    try {
      const res = await fetch("/api/roleta/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao girar");
        setState("wheel");
        return;
      }

      const prize = data.prize as SpinResult;
      setResult(prize);

      const prizeIndex = WHEEL_PRIZES.findIndex((p) => p.slug === prize.slug);
      const segmentAngle = 360 / WHEEL_PRIZES.length;
      const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
      const extraSpins = 5 + Math.floor(Math.random() * 3);
      const totalRotation = rotation + extraSpins * 360 + targetAngle + (Math.random() * 10 - 5);

      setRotation(totalRotation);

      setTimeout(() => {
        setState("result");
      }, 4500);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
      setState("wheel");
    }
  }, [leadId, rotation]);

  // Get winning prize data for display
  const winningPrize = result ? WHEEL_PRIZES.find((p) => p.slug === result.slug) : null;

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Toaster position="top-center" />

      <SharedHeader title="Roleta" badge="Carnaval 2026" showBack={false} />

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
                <p className="text-keepit-dark/50 text-sm mt-1">para girar a roleta de premios</p>
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

          {/* WHEEL */}
          {(state === "wheel" || state === "spinning") && (
            <motion.div
              key="wheel"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm flex flex-col items-center gap-6"
            >
              <p className="text-lg font-black text-keepit-dark">
                Ola, <span className="text-keepit-brand">{leadName.split(" ")[0]}</span>!
              </p>

              {/* Wheel container */}
              <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                {/* Pointer (top center) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-keepit-dark drop-shadow-lg" />
                </div>

                {/* Wheel */}
                <motion.div
                  ref={wheelRef}
                  className="w-full h-full rounded-full border-4 border-keepit-dark/10 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
                  animate={{ rotate: rotation }}
                  transition={{
                    duration: state === "spinning" ? 4 : 0,
                    ease: [0.2, 0.8, 0.3, 1],
                  }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {WHEEL_PRIZES.map((prize, i) => {
                      const segAngle = 360 / WHEEL_PRIZES.length;
                      const startAngle = i * segAngle - 90;
                      const endAngle = startAngle + segAngle;
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const x1 = 100 + 100 * Math.cos(startRad);
                      const y1 = 100 + 100 * Math.sin(startRad);
                      const x2 = 100 + 100 * Math.cos(endRad);
                      const y2 = 100 + 100 * Math.sin(endRad);
                      const largeArc = segAngle > 180 ? 1 : 0;

                      const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
                      const textX = 100 + 60 * Math.cos(midAngle);
                      const textY = 100 + 60 * Math.sin(midAngle);
                      const textRotation = (startAngle + endAngle) / 2 + 90;

                      return (
                        <g key={prize.slug}>
                          <path
                            d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                            fill={prize.color}
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="1"
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                            className="text-[7px] font-bold fill-black/80"
                          >
                            {prize.emoji}
                          </text>
                          <text
                            x={textX}
                            y={textY + 9}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${textRotation}, ${textX}, ${textY + 9})`}
                            className="text-[4.5px] font-semibold fill-black/70"
                          >
                            {prize.name.length > 14 ? prize.name.slice(0, 14) + "…" : prize.name}
                          </text>
                        </g>
                      );
                    })}
                    {/* Center circle */}
                    <circle cx="100" cy="100" r="18" fill="white" stroke="#1A1A1A" strokeWidth="2" />
                    <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="text-[8px] font-black fill-keepit-brand">
                      KEEPIT
                    </text>
                  </svg>
                </motion.div>
              </div>

              {/* Spin button */}
              <Button
                onClick={handleSpin}
                disabled={state === "spinning"}
                className="btn-pill btn-pill-primary w-48 h-14 text-lg font-black shadow-[0_4px_20px_rgba(52,191,88,0.3)]"
              >
                {state === "spinning" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  "GIRAR!"
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
