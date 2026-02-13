"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoaderSkeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStoredLead, saveLead } from "@/lib/lead-storage";

const entranceEase = [0.2, 0.8, 0.2, 1] as const;

export default function RegisterPage() {
  const router = useRouter();
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
      newErrors.name = "Nome é obrigatório";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
    }

    const phoneClean = formData.phone.replace(/\D/g, "");
    if (!phoneClean) {
      newErrors.phone = "Telefone é obrigatório";
    } else if (phoneClean.length < 10 || phoneClean.length > 11) {
      newErrors.phone = "Telefone inválido (DDD + número)";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (!formData.lgpd_consent) {
      newErrors.lgpd_consent = "Você deve aceitar os termos para continuar";
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
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: entranceEase as unknown as [number, number, number, number] }}
        className="w-full max-w-md"
      >
        <div className="card-keepit p-8 md:p-10">
          <div className="text-center mb-8">
            <span className="text-2xl font-black tracking-tighter text-keepit-dark">
              KEEPIT
            </span>
            <div className="inline-flex items-center gap-1.5 bg-keepit-brand/15 text-keepit-brand text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ml-3">
              <Sparkles className="h-3 w-3" />
              Carnaval 2026
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-keepit-dark tracking-tight mt-5 mb-2">
              Cadastre-se e aproveite
            </h1>
            <p className="text-keepit-dark/60 text-sm">
              Preencha seus dados para acessar o mural de fotos, mapa,
              programação, sorteios e muito mais.
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
                  política de privacidade
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

            <div className="pt-2">
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
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-keepit-dark/40 mt-4">
          Sambódromo do Anhembi — 13, 14 e 15 de Fevereiro de 2026
        </p>
      </motion.div>
    </div>
  );
}
