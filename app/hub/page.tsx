"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Camera,
  MapPin,
  Calendar,
  Sparkles,
  Upload,
  Gift,
  ArrowRight,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedHeader } from "@/components/shared-header";
import { HubPageSkeleton } from "@/components/ui/skeleton";

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
const featureCards = [
  {
    id: "ai-photo",
    icon: Sparkles,
    title: "Foto com IA",
    description: "Crie sua foto com IA em um cenario carnavalesco!",
    href: "/hub/ai-photo",
    color: "text-orange-500",
    bgColor: "bg-orange-500/15",
    tint: "card-tint-orange",
  },
  {
    id: "loja",
    icon: Store,
    title: "Loja Keepit",
    description: "Confira os produtos exclusivos Keepit para o Carnaval!",
    href: "https://loja.globalkeepit.com",
    color: "text-keepit-brand",
    bgColor: "bg-keepit-brand/15",
    tint: "card-tint-green",
    external: true,
  },
  {
    id: "mural",
    icon: Camera,
    title: "Mural de Fotos",
    description: "Veja todas as fotos do evento e apareca no telao!",
    href: "/mural",
    color: "text-keepit-brand",
    bgColor: "bg-keepit-brand/15",
    tint: "card-tint-green",
  },
  {
    id: "mapa",
    icon: MapPin,
    title: "Mapa Interativo",
    description: "Encontre palcos, banheiros e a area Keepit.",
    href: "/mapa",
    color: "text-blue-500",
    bgColor: "bg-blue-500/15",
    tint: "card-tint-blue",
  },
  {
    id: "programacao",
    icon: Calendar,
    title: "Programacao",
    description: "Horarios dos desfiles e atracoes do evento.",
    href: "/programacao",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/15",
    tint: "card-tint-indigo",
  },
  {
    id: "sorteio",
    icon: Sparkles,
    title: "Sorteios",
    description: "Acompanhe sua participacao nos sorteios exclusivos!",
    href: "/sorteio",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/15",
    tint: "card-tint-yellow",
  },
  {
    id: "upload",
    icon: Upload,
    title: "Enviar Foto",
    description: "Envie sua foto e apareca no mural e no telao!",
    href: "/upload",
    color: "text-pink-500",
    bgColor: "bg-pink-500/15",
    tint: "card-tint-pink",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function HubPage() {
  const router = useRouter();
  const [leadData, setLeadData] = useState<StoredLead | null>(null);
  const [isReady, setIsReady] = useState(false);

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
      {/* ---- Header ---- */}
      <SharedHeader badge="Carnaval 2026" showBack={false} />

      {/* ---- Welcome Section ---- */}
      <section className="section-white">
        <div className="max-w-6xl mx-auto px-5 pt-10 pb-6 md:px-6 md:pt-20 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE }}
          >
            <h1 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] leading-[0.95] text-keepit-dark mb-2 md:mb-4">
              Ola, <span className="text-gradient-green">{firstName}</span>!
            </h1>
            <p className="text-base md:text-lg text-keepit-dark/60 max-w-md">
              Aproveite sua experiencia completa no Carnaval do Anhembi.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Feature Cards Grid ---- */}
      <section className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6"
        >
          {featureCards.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={itemVariants}
                onClick={() =>
                  "external" in feature && feature.external
                    ? window.open(feature.href, "_blank")
                    : router.push(feature.href)
                }
                className={`card-keepit ${feature.tint} cursor-pointer group p-4 md:p-10 flex flex-col relative overflow-hidden`}
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
                Conheca a <span className="text-gradient-green">Keepit</span>
              </h2>
              <p className="text-keepit-dark/60 text-base md:text-lg max-w-lg mb-5 md:mb-8">
                Armarios inteligentes para guarda-volumes. Seja um franqueado e
                faca parte desta revolucao!
              </p>
              <Button
                onClick={() => window.open("https://globalkeepit.com", "_blank")}
                className="btn-pill btn-pill-primary inline-flex items-center gap-2"
              >
                <Gift className="h-5 w-5" />
                Quero ser franqueado
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---- Bottom spacer (replaces fixed footer) ---- */}
      <div className="h-4" />
    </div>
  );
}
