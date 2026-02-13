"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoaderSkeleton } from "@/components/ui/skeleton";
import {
  Camera,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStoredLead, saveLead } from "@/lib/lead-storage";

const features = [
  {
    icon: Camera,
    title: "Mural de Fotos",
    description: "Acesse todas as fotos do evento e apareca no telao!",
    tint: "card-tint-green",
  },
  {
    icon: MapPin,
    title: "Mapa Interativo",
    description: "Encontre palcos, banheiros, praca de alimentacao e a area Keepit.",
    tint: "card-tint-orange",
  },
  {
    icon: Calendar,
    title: "Programacao",
    description: "Confira os horarios dos desfiles e nao perca nenhum momento.",
    tint: "card-tint-indigo",
  },
  {
    icon: Sparkles,
    title: "Sorteios",
    description: "Participe automaticamente dos sorteios exclusivos Keepit!",
    tint: "card-tint-mint",
  },
];

const entranceEase = [0.2, 0.8, 0.2, 1] as const;

const entranceVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 1.4,
      ease: entranceEase as unknown as [number, number, number, number],
    },
  }),
};

export default function GatePage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRegistration] = useState(() => {
    if (typeof window !== "undefined") {
      const existingLead = getStoredLead();
      return existingLead !== null;
    }
    return true;
  });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    franchise_interest: false,
    lgpd_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const existingLead = getStoredLead();
    if (existingLead) {
      router.replace("/hub");
    }
  }, [router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome e obrigatorio";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    }

    const phoneClean = formData.phone.replace(/\D/g, "");
    if (!phoneClean) {
      newErrors.phone = "Telefone e obrigatorio";
    } else if (phoneClean.length < 10 || phoneClean.length > 11) {
      newErrors.phone = "Telefone invalido (DDD + numero)";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "E-mail e obrigatorio";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "E-mail invalido";
    }

    if (!formData.lgpd_consent) {
      newErrors.lgpd_consent = "Voce deve aceitar os termos para continuar";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: formData.name.trim(),
          phone: formData.phone.replace(/\D/g, ""),
          email: formData.email.trim().toLowerCase(),
          franchise_interest: formData.franchise_interest,
          lgpd_consent: formData.lgpd_consent,
          origin: "qr_code",
        })
        .select("id, name, email, phone, created_at")
        .single();

      if (error) {
        setErrors({ form: "Erro ao cadastrar. Tente novamente." });
        setIsLoading(false);
        return;
      }

      if (data) {
        saveLead({
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          createdAt: data.created_at,
        });
        router.push("/hub");
      }
    } catch {
      setErrors({ form: "Erro ao cadastrar. Tente novamente." });
      setIsLoading(false);
    }
  };

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  if (isCheckingRegistration) {
    return <PageLoaderSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      {/* Navbar — fixed, transparent, matching globalkeepit.com */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-keepit-dark">
            KEEPIT
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-keepit-dark/70 uppercase tracking-wider">
          <span>Carnaval 2026</span>
          <span>Anhembi</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
        >
          Entrar na lista
        </Button>
      </nav>

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="features"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Hero Section — globalkeepit.com style */}
            <main className="pt-56 pb-40 px-6 overflow-hidden">
              <div className="max-w-6xl mx-auto">
                {/* Badge */}
                <motion.div
                  custom={0}
                  variants={entranceVariants}
                  initial="hidden"
                  animate="visible"
                  className="mb-8"
                >
                  <span className="badge-keepit">
                    <Sparkles className="size-4" />
                    Carnaval 2026 — Anhembi
                  </span>
                </motion.div>

                {/* Hero heading — weight 900, tight tracking like globalkeepit.com */}
                <motion.h1
                  custom={1}
                  variants={entranceVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-5xl sm:text-7xl md:text-[80px] font-black text-keepit-dark leading-[0.9] tracking-[-0.05em] mb-6 max-w-4xl"
                >
                  Viva o Carnaval.
                  <br />
                  <span className="text-gradient-green">Keepit Experience.</span>
                </motion.h1>

                <motion.p
                  custom={2}
                  variants={entranceVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-lg md:text-xl text-keepit-dark/60 max-w-xl mb-10"
                >
                  Apareca no telao, acesse fotos exclusivas, mapa interativo,
                  programacao e sorteios. Tudo em um so lugar.
                </motion.p>

                {/* CTA buttons — globalkeepit.com style */}
                <motion.div
                  custom={3}
                  variants={entranceVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-wrap gap-4"
                >
                  <Button
                    size="lg"
                    onClick={() => setShowForm(true)}
                  >
                    Acessar Agora
                    <ArrowRight className="ml-2 size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                  >
                    17 e 18 de Fevereiro
                  </Button>
                </motion.div>
              </div>
            </main>

            {/* Features Section — white bg, tinted cards */}
            <section className="section-white py-32 px-6">
              <div className="max-w-6xl mx-auto">
                <motion.h2
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
                  className="text-4xl sm:text-5xl md:text-6xl font-black text-keepit-dark tracking-[-0.05em] leading-[0.95] mb-4 max-w-3xl"
                >
                  Tudo que voce precisa.
                  <br />
                  <span className="text-gradient-green">Na palma da mao.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                  className="text-lg text-keepit-dark/60 mb-16 max-w-xl"
                >
                  Cadastre-se gratuitamente e desbloqueie todas as experiencias do Carnaval Keepit.
                </motion.p>

                <div className="grid md:grid-cols-2 gap-6">
                  {features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: index * 0.1,
                          duration: 1.4,
                          ease: [0.2, 0.8, 0.2, 1],
                        }}
                        className={`card-keepit ${feature.tint} p-10 md:p-12`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-keepit-emerald/10 flex items-center justify-center mb-6">
                          <IconComponent className="size-7 text-keepit-emerald" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-keepit-dark tracking-tight mb-3">
                          {feature.title}
                        </h3>
                        <p className="text-keepit-dark/60 text-base leading-relaxed blur-[2px] select-none">
                          {feature.description}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* CTA Section — mint bg like globalkeepit.com */}
            <section className="section-mint py-40 px-6">
              <div className="max-w-3xl mx-auto text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
                  className="text-4xl sm:text-5xl md:text-6xl font-black text-keepit-dark tracking-[-0.05em] leading-[0.95] mb-6"
                >
                  Cadastre-se e aproveite.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                  className="text-lg text-keepit-dark/60 mb-10 max-w-lg mx-auto"
                >
                  Entre na lista para ser o primeiro a acessar todas as experiencias do
                  Carnaval 2026 no Anhembi.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
                >
                  <Button
                    size="xl"
                    onClick={() => setShowForm(true)}
                    className="animate-pulse-glow"
                  >
                    Entrar na lista
                    <ArrowRight className="ml-2 size-5" />
                  </Button>
                </motion.div>
                <p className="text-sm text-keepit-dark/40 mt-6 uppercase tracking-widest font-medium">
                  Respeitamos sua privacidade
                </p>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-[rgba(0,0,0,0.05)] py-16 px-6">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xl font-black tracking-tighter text-keepit-dark">KEEPIT</span>
                  <p className="text-sm text-keepit-dark/40 mt-1">
                    Carnaval 2026 — Sambodromo do Anhembi
                  </p>
                </div>
                <p className="text-sm text-keepit-dark/40">
                  &copy; 2026 Keepit. Todos os direitos reservados.
                </p>
              </div>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="min-h-screen flex items-center justify-center px-6 py-24"
          >
            <div className="w-full max-w-md">
              {/* Form card — globalkeepit.com rounded style */}
              <div className="card-keepit p-10 md:p-12">
                <div className="text-center mb-8">
                  <span className="text-xl font-black tracking-tighter text-keepit-dark">KEEPIT</span>
                  <h2 className="text-3xl font-black text-keepit-dark tracking-tight mt-4 mb-2">
                    Acesse todos os recursos
                  </h2>
                  <p className="text-keepit-dark/60 text-sm">
                    Preencha seus dados para participar dos sorteios e acessar o
                    mural de fotos
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-keepit-dark">
                      Nome completo
                    </label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    {errors.name && (
                      <p className="text-destructive text-xs">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-sm font-medium text-keepit-dark">
                      Telefone (com DDD)
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: formatPhone(e.target.value),
                        }))
                      }
                      disabled={isLoading}
                      maxLength={15}
                    />
                    {errors.phone && (
                      <p className="text-destructive text-xs">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-keepit-dark">
                      E-mail
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs">{errors.email}</p>
                    )}
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="lgpd"
                      checked={formData.lgpd_consent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lgpd_consent: e.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-keepit-dark/20 accent-keepit-emerald"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="lgpd"
                      className="text-sm text-keepit-dark/60 cursor-pointer"
                    >
                      Concordo com os{" "}
                      <a
                        href="/termos"
                        className="text-keepit-emerald underline"
                        target="_blank"
                      >
                        termos de uso
                      </a>{" "}
                      e{" "}
                      <a
                        href="/privacidade"
                        className="text-keepit-emerald underline"
                        target="_blank"
                      >
                        politica de privacidade
                      </a>
                    </label>
                  </div>
                  {errors.lgpd_consent && (
                    <p className="text-destructive text-xs">
                      {errors.lgpd_consent}
                    </p>
                  )}

                  {errors.form && (
                    <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl">
                      {errors.form}
                    </div>
                  )}

                  <div className="pt-2 space-y-3">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 size-4" />
                          Cadastrar e Acessar
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-keepit-dark/50"
                      onClick={() => setShowForm(false)}
                      disabled={isLoading}
                    >
                      Voltar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
