"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Sparkles,
  Gift,
  ArrowRight,
  Store,
  Wand2,
  Trophy,
  X,
  Camera,
  MapPin,
  Calendar,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedHeader } from "@/components/shared-header";
import { HubPageSkeleton } from "@/components/ui/skeleton";

import { Input } from "@/components/ui/input";
import { Loader2 as Spinner } from "lucide-react";
import { Toaster, toast } from "sonner";
import { getStoredLead, type StoredLead } from "@/lib/lead-storage";

/* ------------------------------------------------------------------ */
/*  Animation config — globalkeepit.com style                         */
/* ------------------------------------------------------------------ */
const ENTRANCE_DURATION = 1.4;
const ENTRANCE_EASE = [0.2, 0.8, 0.2, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ENTRANCE_DURATION,
      ease: ENTRANCE_EASE,
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Feature cards data                                                 */
/* ------------------------------------------------------------------ */
const lojaProducts = [
  { src: "https://loja.globalkeepit.com/images/products/pedras-rosto.webp", name: "Pedras Hype Glow" },
  { src: "https://loja.globalkeepit.com/images/products/lip-balm-morango.avif", name: "Lip Balm Morango" },
  { src: "https://loja.globalkeepit.com/images/products/lip-balm-melancia.jpg", name: "Lip Balm Melancia" },
  { src: "https://loja.globalkeepit.com/images/products/preservativo-combo.webp", name: "Combo c/ Óculos" },
  { src: "https://loja.globalkeepit.com/images/products/rexona-masc.webp", name: "Rexona Clinical" },
  { src: "https://loja.globalkeepit.com/images/products/go-energy.webp", name: "GO! Energy Gel" },
  { src: "https://loja.globalkeepit.com/images/products/alcool-gel.webp", name: "Álcool Gel" },
  { src: "https://loja.globalkeepit.com/images/products/epocler.jpeg", name: "Epocler" },
];

const featureCards = [
  {
    id: "sorteio",
    icon: Sparkles,
    title: "Sorteios",
    description: "Você está concorrendo a um ingresso para o Camarote do Desfile das Campeãs!",
    href: "#sorteio",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/15",
    tint: "card-tint-yellow",
  },
  // TODO: reativar quando prontos — mural, mapa, programacao, upload
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function HubPage() {
  const router = useRouter();
  const [leadData, setLeadData] = useState<StoredLead | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSorteio, setShowSorteio] = useState(false);
  const [showFranquia, setShowFranquia] = useState(false);
  const [franquiaSubmitted, setFranquiaSubmitted] = useState(false);
  const [franquiaLoading, setFranquiaLoading] = useState(false);
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleFranquiaSubmit() {
    if (!fName.trim() || fName.trim().length < 3) {
      toast.error("Nome deve ter pelo menos 3 caracteres");
      return;
    }
    if (!fEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail)) {
      toast.error("Email inválido");
      return;
    }
    if (fPhone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido (inclua o DDD)");
      return;
    }

    setFranquiaLoading(true);
    try {
      const res = await fetch("/api/franquia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName.trim(),
          email: fEmail.trim(),
          phone: fPhone.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar");
        return;
      }
      setFranquiaSubmitted(true);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setFranquiaLoading(false);
    }
  }

  // Auto-scroll product carousel (needs isReady so it runs after skeleton is replaced)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let scrollPos = 0;
    const speed = 0.5;
    const interval = setInterval(() => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth - el.clientWidth) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
    }, 30);
    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    const lead = getStoredLead();
    if (!lead) {
      router.replace("/");
    } else {
      setLeadData(lead);
    }
    setIsReady(true);
  }, [router]);

  if (!isReady || !leadData) {
    return <HubPageSkeleton />;
  }

  const firstName = leadData?.name?.split(" ")[0] || "Participante";

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Toaster position="top-center" />
      {/* ---- Header ---- */}
      <SharedHeader badge="Carnaval 2026" showBack={false} />

      {/* ---- Welcome Section ---- */}
      <section className="section-white">
        <div className="max-w-6xl mx-auto px-5 pt-10 pb-8 md:px-6 md:pt-20 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE }}
          >
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-keepit-dark mb-2 md:mb-4">
              Olá, <span className="text-keepit-brand">{firstName}</span>!
            </h1>
            <p className="text-base md:text-lg text-keepit-dark/60 max-w-md">
              Aproveite sua experiência completa no Carnaval do Anhembi.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Cards Section ---- */}
      <section className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-12 space-y-5 md:space-y-8">

        {/* AI Photo Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE }}
          onClick={() => router.push("/hub/ai-photo")}
          className="card-keepit card-tint-purple cursor-pointer group relative overflow-hidden rounded-3xl"
        >
          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 p-6 md:p-10">
            {/* Template preview */}
            <div className="relative w-full md:w-56 h-48 md:h-56 rounded-2xl overflow-hidden shrink-0">
              <Image
                src="/modeloskeepit/keepittemplate3.jpg"
                alt="Exemplo de foto com IA"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* Copy */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-purple-500/15 text-purple-600 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
                <Wand2 className="h-3.5 w-3.5" />
                Novidade
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[-0.04em] leading-[0.95] text-keepit-dark mb-2 md:mb-3">
                Crie sua foto com{" "}
                <span className="text-purple-500">IA</span>
              </h2>
              <p className="text-sm md:text-base text-keepit-dark/60 max-w-md mb-4 md:mb-6">
                Escolha um template exclusivo e gere uma foto incrível com
                inteligência artificial. É rápido e gratuito!
              </p>
              <Button className="btn-pill btn-pill-primary inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Criar minha foto
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Loja Keepit */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE }}
          className="card-keepit card-tint-green overflow-hidden rounded-3xl p-6 md:p-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-keepit-brand/15 flex items-center justify-center">
              <Store className="h-5 w-5 md:h-6 md:w-6 text-keepit-brand" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-keepit-dark">
                Loja Keepit
              </h2>
              <p className="text-xs md:text-sm text-keepit-dark/60">
                Produtos essenciais para o Carnaval
              </p>
            </div>
          </div>

          {/* Product carousel */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 py-2"
          >
            {lojaProducts.map((product) => (
              <div
                key={product.name}
                className="shrink-0 w-28 md:w-36"
              >
                <div className="bg-white rounded-2xl p-2 shadow-sm aspect-square flex items-center justify-center mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.src}
                    alt={product.name}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <p className="text-xs text-keepit-dark/70 text-center font-medium truncate">
                  {product.name}
                </p>
              </div>
            ))}
          </div>

          <Button
            onClick={() => window.open("https://loja.globalkeepit.com", "_blank")}
            className="btn-pill btn-pill-primary inline-flex items-center gap-2 mt-5 mb-1"
          >
            Ver produtos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6"
        >
          {featureCards.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={itemVariants}
                onClick={() => {
                  if (feature.id === "sorteio") {
                    setShowSorteio(true);
                  } else if ("external" in feature && feature.external) {
                    window.open(feature.href, "_blank");
                  } else {
                    router.push(feature.href);
                  }
                }}
                className={`card-keepit ${feature.tint} cursor-pointer group p-6 md:p-10 flex flex-col relative overflow-hidden`}
              >
                {/* Icon */}
                <div
                  className={`h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl ${feature.bgColor} flex items-center justify-center mb-3 md:mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent className={`h-5 w-5 md:h-7 md:w-7 ${feature.color}`} />
                </div>

                {/* Title */}
                <h3 className="text-base md:text-2xl font-black tracking-tight text-keepit-dark mb-1 md:mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-xs md:text-sm text-keepit-dark/60 leading-relaxed mb-3 md:mb-6">
                  {feature.description}
                </p>

                {/* Arrow */}
                <div className="mt-auto">
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-keepit-dark/20 group-hover:text-keepit-dark/60 group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </section>

      {/* ---- Keepit Franchise CTA ---- */}
      <section className="section-mint">
        <div className="max-w-6xl mx-auto px-5 py-10 md:px-6 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE }}
            className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8"
          >
            {/* Icon */}
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-keepit-emerald/20 flex items-center justify-center shrink-0">
              <Store className="h-6 w-6 md:h-8 md:w-8 text-keepit-emerald" />
            </div>

            {/* Copy */}
            <div className="flex-1">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-[-0.04em] leading-[0.95] text-keepit-dark mb-2 md:mb-4">
                Conheça a <span className="text-gradient-green">Keepit</span>
              </h2>
              <p className="text-keepit-dark/60 text-base md:text-lg max-w-lg mb-5 md:mb-8">
                Lojas inteligentes de autoatendimento. Seja um franqueado e
                faça parte desta revolução!
              </p>
              <Button
                onClick={() => setShowFranquia(true)}
                className="btn-pill btn-pill-primary inline-flex items-center gap-2"
              >
                <Gift className="h-5 w-5" />
                Quero ser franqueado
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---- Sorteio Modal ---- */}
      {showSorteio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-keepit p-6 md:p-10 max-w-md w-full relative"
          >
            <button
              onClick={() => setShowSorteio(false)}
              className="absolute top-4 right-4 text-keepit-dark/40 hover:text-keepit-dark"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-yellow-500/15 flex items-center justify-center mb-4">
                <Trophy className="h-7 w-7 text-yellow-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-keepit-dark mb-2">
                Você está concorrendo!
              </h3>
              <p className="text-keepit-dark/60 text-sm md:text-base mb-4">
                Ao se cadastrar, você já está automaticamente concorrendo a um
                <strong className="text-keepit-dark"> ingresso para o Camarote do Desfile das Campeãs</strong>.
                Boa sorte!
              </p>
              <p className="text-xs text-keepit-dark/40">
                O sorteio será realizado após o evento. O vencedor será notificado por e-mail e telefone.
              </p>
              <Button
                onClick={() => setShowSorteio(false)}
                className="btn-pill btn-pill-primary mt-6"
              >
                Entendi!
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---- Franquia Modal ---- */}
      {showFranquia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-keepit p-6 md:p-10 max-w-md w-full relative"
          >
            <button
              onClick={() => { setShowFranquia(false); setFranquiaSubmitted(false); }}
              className="absolute top-4 right-4 text-keepit-dark/40 hover:text-keepit-dark"
            >
              <X className="h-5 w-5" />
            </button>

            {franquiaSubmitted ? (
              <div className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-keepit-brand/15 flex items-center justify-center mb-4">
                  <Store className="h-7 w-7 text-keepit-brand" />
                </div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-keepit-dark mb-2">
                  Recebemos seus dados!
                </h3>
                <p className="text-keepit-dark/60 text-sm md:text-base mb-4">
                  Nossa equipe entrará em contato em breve para conversar sobre a franquia Keepit.
                </p>
                <Button
                  onClick={() => { setShowFranquia(false); setFranquiaSubmitted(false); }}
                  className="btn-pill btn-pill-primary mt-2"
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-keepit-brand/15 flex items-center justify-center mb-4">
                  <Store className="h-7 w-7 text-keepit-brand" />
                </div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-keepit-dark mb-2">
                  Seja um Franqueado
                </h3>
                <p className="text-keepit-dark/60 text-sm md:text-base mb-5">
                  Preencha seus dados e nossa equipe entrará em contato.
                </p>

                <div className="w-full space-y-3 mb-5">
                  <Input
                    placeholder="Seu nome completo"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 h-12 rounded-xl"
                  />
                  <Input
                    type="email"
                    placeholder="Seu email"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 h-12 rounded-xl"
                  />
                  <Input
                    type="tel"
                    placeholder="(XX) XXXXX-XXXX"
                    value={fPhone}
                    onChange={(e) => setFPhone(formatPhone(e.target.value))}
                    className="bg-white border-keepit-dark/10 text-keepit-dark placeholder:text-keepit-dark/40 h-12 rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleFranquiaSubmit}
                  disabled={franquiaLoading}
                  className="btn-pill btn-pill-primary w-full h-12 text-base"
                >
                  {franquiaLoading ? (
                    <Spinner className="w-5 h-5 animate-spin" />
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ---- Bottom spacer (replaces fixed footer) ---- */}
      <div className="h-4" />
      {/* Hidden: Turbopack requires these icons in module graph */}
      <span className="sr-only" aria-hidden="true"><Camera /><MapPin /><Calendar /><Upload /></span>
    </div>
  );
}
