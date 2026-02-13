"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Trophy,
  MapPin,
  Timer,
  Music,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SharedHeader } from "@/components/shared-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageLoaderSkeleton } from "@/components/ui/skeleton";

import { getStoredLead, type StoredLead } from "@/lib/lead-storage";
import {
  getParadesByDate,
  getNextParade,
  getCurrentParade,
  getParadeDateTime,
  formatTime,
  EVENT_DATES,
  type ParadeEntry,
} from "@/lib/data/parade-schedule";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateCountdown(targetDate: Date): CountdownTime {
  const now = new Date();
  const diff = Math.max(0, targetDate.getTime() - now.getTime());

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function getDefaultTab(): string {
  const now = new Date();
  const day1 = new Date(EVENT_DATES.day1 + "T21:30:00");
  const day2End = new Date(EVENT_DATES.day2 + "T06:30:00");
  day2End.setDate(day2End.getDate() + 1);

  // If we're past day 1 start but before day 2 ends (considering overnight parades)
  if (now >= day1) {
    const day1End = new Date(EVENT_DATES.day1 + "T06:30:00");
    day1End.setDate(day1End.getDate() + 1);

    if (now < day1End) {
      return EVENT_DATES.day1;
    }
    return EVENT_DATES.day2;
  }

  return EVENT_DATES.day1;
}

function CountdownDisplay({ countdown }: { countdown: CountdownTime }) {
  const units = [
    { value: countdown.days, label: "dias" },
    { value: countdown.hours, label: "horas" },
    { value: countdown.minutes, label: "min" },
    { value: countdown.seconds, label: "seg" },
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span className="text-2xl md:text-3xl font-bold text-keepit-brand tabular-nums">
              {unit.value.toString().padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">{unit.label}</span>
          </div>
          {index < units.length - 1 && (
            <span className="text-xl text-muted-foreground mb-4">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ParadeCard({
  parade,
  isNext,
  isCurrent,
  index,
}: {
  parade: ParadeEntry;
  isNext: boolean;
  isCurrent: boolean;
  index: number;
}) {
  const { school } = parade;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.6 }}
    >
      <Card
        className={`bg-card border-border transition-all duration-300 overflow-hidden ${
          isCurrent
            ? "ring-2 ring-keepit-brand border-keepit-brand shadow-glow"
            : isNext
            ? "ring-1 ring-keepit-brand/50 border-keepit-brand/50"
            : "hover:border-muted-foreground/30"
        }`}
      >
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Color bar */}
            <div
              className={`w-2 ${school.colorClasses.bg} shrink-0`}
              aria-hidden="true"
            />

            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status badges */}
                  <div className="flex items-center gap-2 mb-2">
                    {isCurrent && (
                      <Badge className="bg-keepit-brand text-white font-semibold animate-pulse">
                        <Music className="h-3 w-3 mr-1" />
                        Agora
                      </Badge>
                    )}
                    {isNext && !isCurrent && (
                      <Badge
                        variant="outline"
                        className="border-keepit-brand/30 text-keepit-brand"
                      >
                        <Timer className="h-3 w-3 mr-1" />
                        Proximo
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {parade.order}o desfile
                    </Badge>
                  </div>

                  {/* School name */}
                  <h3 className="font-black text-lg tracking-tight text-card-foreground mb-1 line-clamp-1">
                    {school.name}
                  </h3>

                  {/* School info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {school.neighborhood}
                    </span>
                    {school.championships > 0 && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        {school.championships}x campea
                      </span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-xl font-bold text-card-foreground tabular-nums">
                    {formatTime(parade.startTime)}
                  </span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ~{parade.estimatedDuration} min
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProgramacaoPage() {
  const router = useRouter();
  const [leadData] = useState<StoredLead | null>(() => {
    if (typeof window !== "undefined") {
      return getStoredLead();
    }
    return null;
  });
  const [isLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return getStoredLead() === null;
    }
    return true;
  });

  const [selectedDate, setSelectedDate] = useState(getDefaultTab);
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [nextParade, setNextParade] = useState<ParadeEntry | null>(null);
  const [currentParade, setCurrentParade] = useState<ParadeEntry | null>(null);

  const updateParadeStatus = useCallback(() => {
    const now = new Date();
    const next = getNextParade(now);
    const current = getCurrentParade(now);

    setNextParade(next);
    setCurrentParade(current);

    if (next) {
      const targetDate = getParadeDateTime(next);
      setCountdown(calculateCountdown(targetDate));
    }
  }, []);

  useEffect(() => {
    if (!leadData) {
      router.replace("/");
    }
  }, [router, leadData]);

  useEffect(() => {
    // Initial update is done via the interval's first tick
    const interval = setInterval(updateParadeStatus, 1000);
    // Trigger immediate update using setTimeout to avoid sync setState in effect
    const immediateUpdate = setTimeout(updateParadeStatus, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(immediateUpdate);
    };
  }, [updateParadeStatus]);

  if (isLoading) {
    return <PageLoaderSkeleton />;
  }

  const day1Parades = getParadesByDate(EVENT_DATES.day1);
  const day2Parades = getParadesByDate(EVENT_DATES.day2);

  const formatDateLabel = (date: string) => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <SharedHeader title="Programação" badge="Carnaval 2026" />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Countdown Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-keepit-brand/10 border-purple-500/20">
            <CardContent className="py-6">
              {currentParade ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-keepit-brand animate-pulse" />
                    <span className="text-sm font-medium text-keepit-brand">
                      DESFILE EM ANDAMENTO
                    </span>
                    <Sparkles className="h-5 w-5 text-keepit-brand animate-pulse" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                    {currentParade.school.name}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Proximo: {nextParade && nextParade.id !== currentParade.id
                      ? nextParade.school.name
                      : "Ultimo desfile do dia"}
                  </p>
                </div>
              ) : nextParade ? (
                <div className="text-center">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Proximo desfile
                  </h3>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                    {nextParade.school.name}
                  </h2>
                  <CountdownDisplay countdown={countdown} />
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg font-medium text-foreground">
                    Aguarde a programacao do Carnaval 2026
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    17 e 18 de Fevereiro no Sambodromo do Anhembi
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Day Tabs */}
        <Tabs
          value={selectedDate}
          onValueChange={setSelectedDate}
          className="w-full"
        >
          <TabsList className="w-full mb-6 bg-muted/50">
            <TabsTrigger
              value={EVENT_DATES.day1}
              className="flex-1 data-[state=active]:bg-keepit-dark data-[state=active]:text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Terca, </span>
              {formatDateLabel(EVENT_DATES.day1)}
            </TabsTrigger>
            <TabsTrigger
              value={EVENT_DATES.day2}
              className="flex-1 data-[state=active]:bg-keepit-dark data-[state=active]:text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Quarta, </span>
              {formatDateLabel(EVENT_DATES.day2)}
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value={EVENT_DATES.day1} className="mt-0">
              <motion.div
                key="day1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {day1Parades.map((parade, index) => (
                  <ParadeCard
                    key={parade.id}
                    parade={parade}
                    isNext={nextParade?.id === parade.id}
                    isCurrent={currentParade?.id === parade.id}
                    index={index}
                  />
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value={EVENT_DATES.day2} className="mt-0">
              <motion.div
                key="day2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {day2Parades.map((parade, index) => (
                  <ParadeCard
                    key={parade.id}
                    parade={parade}
                    isNext={nextParade?.id === parade.id}
                    isCurrent={currentParade?.id === parade.id}
                    index={index}
                  />
                ))}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>
            * Horarios sujeitos a alteracoes. Acompanhe as atualizacoes oficiais.
          </p>
          <p className="mt-1">
            Sambodromo do Anhembi - Sao Paulo
          </p>
        </motion.div>
      </main>
    </div>
  );
}
