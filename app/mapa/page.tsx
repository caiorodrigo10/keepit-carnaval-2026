"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Music,
  Utensils,
  Bath,
  LocateFixed,
  Monitor,
  Heart,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoaderSkeleton } from "@/components/ui/skeleton";
import { SharedHeader } from "@/components/shared-header";
import { getStoredLead, type StoredLead } from "@/lib/lead-storage";

// POI types and data
type POIType = "stage" | "restroom" | "food" | "keepit" | "screen" | "firstaid";

interface POI {
  id: string;
  type: POIType;
  name: string;
  description: string;
  x: number; // percentage position
  y: number; // percentage position
}

const POI_ICONS: Record<POIType, typeof MapPin> = {
  stage: Music,
  restroom: Bath,
  food: Utensils,
  keepit: Lock,
  screen: Monitor,
  firstaid: Heart,
};

const POI_COLORS: Record<POIType, string> = {
  stage: "bg-purple-500",
  restroom: "bg-blue-400",
  food: "bg-orange-400",
  keepit: "bg-keepit-brand",
  screen: "bg-pink-500",
  firstaid: "bg-red-500",
};

const POI_LABELS: Record<POIType, string> = {
  stage: "Palco",
  restroom: "Banheiro",
  food: "Alimentacao",
  keepit: "Area Keepit",
  screen: "Telao",
  firstaid: "Primeiro Socorro",
};

// Anhembi Sambadrome POIs - positions are percentages
const POIS: POI[] = [
  // Stages
  {
    id: "stage-1",
    type: "stage",
    name: "Palco Principal",
    description: "Palco principal dos desfiles das escolas de samba. Apresentacoes ao vivo e shows.",
    x: 50,
    y: 15,
  },
  {
    id: "stage-2",
    type: "stage",
    name: "Palco Secundario",
    description: "Palco com DJs e atracoes alternativas durante os intervalos.",
    x: 25,
    y: 45,
  },
  // Keepit Areas (highlighted)
  {
    id: "keepit-1",
    type: "keepit",
    name: "Area Keepit Principal",
    description: "Armarios inteligentes Keepit. Guarde seus pertences com seguranca! Capacete, mochila, celular e mais.",
    x: 70,
    y: 35,
  },
  {
    id: "keepit-2",
    type: "keepit",
    name: "Area Keepit Entrada",
    description: "Ponto Keepit proximo a entrada. Ideal para quem chega e quer guardar bagagem.",
    x: 15,
    y: 85,
  },
  // Screens
  {
    id: "screen-1",
    type: "screen",
    name: "Telao Henco",
    description: "Telao LED oficial. Veja as fotos do mural e apareca aqui!",
    x: 40,
    y: 25,
  },
  {
    id: "screen-2",
    type: "screen",
    name: "Telao Keepit",
    description: "Telao exclusivo Keepit. Suas fotos aparecem aqui!",
    x: 65,
    y: 50,
  },
  {
    id: "screen-3",
    type: "screen",
    name: "Telao Renko",
    description: "Telao parceiro Renko com transmissao ao vivo.",
    x: 80,
    y: 70,
  },
  // Food courts
  {
    id: "food-1",
    type: "food",
    name: "Praca de Alimentacao Norte",
    description: "Diversos restaurantes, lanches, bebidas e sobremesas.",
    x: 30,
    y: 30,
  },
  {
    id: "food-2",
    type: "food",
    name: "Praca de Alimentacao Sul",
    description: "Area gourmet com opcoes variadas de comida e bebida.",
    x: 75,
    y: 75,
  },
  {
    id: "food-3",
    type: "food",
    name: "Bar Central",
    description: "Bebidas, petiscos rapidos e area de descanso.",
    x: 50,
    y: 55,
  },
  // Restrooms
  {
    id: "restroom-1",
    type: "restroom",
    name: "Banheiro Setor A",
    description: "Banheiros com acessibilidade. Fraldario disponivel.",
    x: 20,
    y: 25,
  },
  {
    id: "restroom-2",
    type: "restroom",
    name: "Banheiro Setor B",
    description: "Banheiros masculino e feminino.",
    x: 55,
    y: 40,
  },
  {
    id: "restroom-3",
    type: "restroom",
    name: "Banheiro Setor C",
    description: "Banheiros com acessibilidade.",
    x: 85,
    y: 55,
  },
  {
    id: "restroom-4",
    type: "restroom",
    name: "Banheiro Entrada",
    description: "Banheiros proximos a entrada principal.",
    x: 10,
    y: 70,
  },
  // First aid
  {
    id: "firstaid-1",
    type: "firstaid",
    name: "Posto Medico Central",
    description: "Atendimento medico de emergencia. Disponivel 24h durante o evento.",
    x: 45,
    y: 65,
  },
  {
    id: "firstaid-2",
    type: "firstaid",
    name: "Posto Medico Entrada",
    description: "Posto de primeiros socorros proximo a entrada.",
    x: 15,
    y: 90,
  },
];

// Legend items for display
const LEGEND_ITEMS: { type: POIType; label: string }[] = [
  { type: "keepit", label: "Area Keepit" },
  { type: "stage", label: "Palcos" },
  { type: "screen", label: "Teloes" },
  { type: "food", label: "Alimentacao" },
  { type: "restroom", label: "Banheiros" },
  { type: "firstaid", label: "Primeiro Socorro" },
];

export default function MapaPage() {
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

  // Map interaction state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [activeFilter, setActiveFilter] = useState<POIType | null>(null);

  // Touch/drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);

  useEffect(() => {
    if (!leadData) {
      router.replace("/");
    }
  }, [router, leadData]);

  // Get touch distance for pinch zoom
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      lastTouchDistance.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      // Pan start
      setIsDragging(true);
      lastPosition.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [position]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      const delta = newDistance / lastTouchDistance.current;
      setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 3));
      lastTouchDistance.current = newDistance;
    } else if (e.touches.length === 1 && isDragging) {
      // Pan
      const newX = e.touches[0].clientX - lastPosition.current.x;
      const newY = e.touches[0].clientY - lastPosition.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 3));
  }, []);

  // Handle mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastPosition.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - lastPosition.current.x;
    const newY = e.clientY - lastPosition.current.y;
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const zoomIn = () => setScale((prev) => Math.min(prev * 1.2, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Filter POIs
  const filteredPOIs = activeFilter
    ? POIS.filter((poi) => poi.type === activeFilter)
    : POIS;

  if (isLoading) {
    return <PageLoaderSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <SharedHeader title="Mapa do Anhembi" badge="Interativo" />

      {/* Legend - scrollable horizontal */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-border py-2 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          <Button
            variant={activeFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(null)}
            className={activeFilter === null ? "bg-keepit-dark text-white hover:bg-black" : "border-[rgba(0,0,0,0.05)] bg-white hover:bg-gray-50"}
          >
            Todos
          </Button>
          {LEGEND_ITEMS.map((item) => {
            const Icon = POI_ICONS[item.type];
            const isActive = activeFilter === item.type;
            return (
              <Button
                key={item.type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(isActive ? null : item.type)}
                className={`gap-2 ${isActive ? "bg-keepit-dark text-white hover:bg-black" : "border-[rgba(0,0,0,0.05)] bg-white hover:bg-gray-50"}`}
              >
                <span className={`h-3 w-3 rounded-full ${POI_COLORS[item.type]}`} />
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-muted/30 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Map SVG with POIs */}
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {/* Sambadrome Base Map */}
          <svg
            viewBox="0 0 800 600"
            className="w-full h-full"
            style={{ minWidth: "100%", minHeight: "100%" }}
          >
            {/* Background */}
            <rect x="0" y="0" width="800" height="600" fill="#f8fafc" />

            {/* Sambadrome runway (pista) */}
            <rect
              x="100"
              y="80"
              width="600"
              height="120"
              rx="8"
              fill="#e2e8f0"
              stroke="#34BF58"
              strokeWidth="2"
              strokeOpacity="0.5"
            />
            <text x="400" y="145" textAnchor="middle" fill="#34BF58" fontSize="14" fontWeight="bold" opacity="0.8">
              PISTA DE DESFILE
            </text>

            {/* Sectors - Arquibancadas */}
            <g>
              {/* Sector A - Left */}
              <path
                d="M50 220 L150 220 L150 400 L50 400 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text x="100" y="315" textAnchor="middle" fill="#64748b" fontSize="12">Setor A</text>

              {/* Sector B - Center-left */}
              <path
                d="M170 220 L320 220 L320 400 L170 400 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text x="245" y="315" textAnchor="middle" fill="#64748b" fontSize="12">Setor B</text>

              {/* Sector C - Center */}
              <path
                d="M340 220 L460 220 L460 400 L340 400 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text x="400" y="315" textAnchor="middle" fill="#64748b" fontSize="12">Setor C</text>

              {/* Sector D - Center-right */}
              <path
                d="M480 220 L630 220 L630 400 L480 400 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text x="555" y="315" textAnchor="middle" fill="#64748b" fontSize="12">Setor D</text>

              {/* Sector E - Right */}
              <path
                d="M650 220 L750 220 L750 400 L650 400 Z"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text x="700" y="315" textAnchor="middle" fill="#64748b" fontSize="12">Setor E</text>
            </g>

            {/* Entrance area */}
            <rect
              x="50"
              y="480"
              width="200"
              height="80"
              rx="6"
              fill="#dcfce7"
              stroke="#34BF58"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <text x="150" y="525" textAnchor="middle" fill="#16a34a" fontSize="11" fontWeight="500">
              ENTRADA PRINCIPAL
            </text>

            {/* Exit areas */}
            <rect
              x="550"
              y="480"
              width="200"
              height="80"
              rx="6"
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <text x="650" y="525" textAnchor="middle" fill="#64748b" fontSize="11">
              SAIDA
            </text>

            {/* Central walkway */}
            <rect
              x="360"
              y="420"
              width="80"
              height="160"
              rx="4"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
            <text x="400" y="505" textAnchor="middle" fill="#94a3b8" fontSize="10" transform="rotate(-90, 400, 505)">
              PASSARELA
            </text>

            {/* Decorative elements */}
            <circle cx="400" cy="140" r="20" fill="none" stroke="#34BF58" strokeWidth="1" strokeOpacity="0.3" />
            <circle cx="400" cy="140" r="30" fill="none" stroke="#34BF58" strokeWidth="1" strokeOpacity="0.15" />
          </svg>

          {/* POI Markers */}
          {filteredPOIs.map((poi, index) => {
            const Icon = POI_ICONS[poi.type];
            const isKeepitArea = poi.type === "keepit";
            return (
              <motion.button
                key={poi.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, type: "spring" }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                  isKeepitArea ? "z-20" : "z-10"
                }`}
                style={{
                  left: `${poi.x}%`,
                  top: `${poi.y}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPOI(poi);
                }}
              >
                <div
                  className={`relative ${
                    isKeepitArea ? "animate-pulse" : ""
                  }`}
                >
                  {/* Glow effect for Keepit areas */}
                  {isKeepitArea && (
                    <div className="absolute inset-0 -m-2 rounded-full bg-keepit-brand/30 blur-md" />
                  )}
                  <div
                    className={`relative flex items-center justify-center h-8 w-8 rounded-full ${POI_COLORS[poi.type]} shadow-lg border-2 border-white/20 hover:scale-110 transition-transform`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {/* Pulse ring for Keepit */}
                  {isKeepitArea && (
                    <div className="absolute inset-0 rounded-full border-2 border-keepit-brand animate-ping" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30">
          <Button
            variant="secondary"
            size="icon"
            onClick={zoomIn}
            className="bg-white/95 backdrop-blur-sm border border-border shadow-sm h-10 w-10 rounded-full"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={zoomOut}
            className="bg-white/95 backdrop-blur-sm border border-border shadow-sm h-10 w-10 rounded-full"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={resetView}
            className="bg-white/95 backdrop-blur-sm border border-border shadow-sm h-10 w-10 rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-4 left-4 z-30">
          <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm border border-border shadow-sm">
            <LocateFixed className="h-3 w-3 mr-1" />
            {Math.round(scale * 100)}%
          </Badge>
        </div>

        {/* Gesture hint */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-muted-foreground border border-border shadow-sm">
            Use dois dedos para zoom
          </div>
        </motion.div>
      </div>

      {/* POI Detail Modal */}
      <AnimatePresence>
        {selectedPOI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedPOI(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="bg-white border-t border-x border-border rounded-t-[24px] rounded-b-none shadow-xl">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl ${POI_COLORS[selectedPOI.type]} flex items-center justify-center`}>
                        {(() => {
                          const Icon = POI_ICONS[selectedPOI.type];
                          return <Icon className="h-6 w-6 text-white" />;
                        })()}
                      </div>
                      <div>
                        <h3 className="font-black text-xl tracking-tight text-card-foreground">
                          {selectedPOI.name}
                        </h3>
                        <Badge variant="outline" className="mt-1">
                          {POI_LABELS[selectedPOI.type]}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedPOI(null)}
                      className="text-muted-foreground"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {selectedPOI.description}
                  </p>
                  {selectedPOI.type === "keepit" && (
                    <Button
                      className="w-full font-semibold"
                      onClick={() => window.open("https://globalkeepit.com", "_blank")}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Conhecer a Keepit
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
