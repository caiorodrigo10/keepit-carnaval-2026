"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { QRCodeCanvas } from "./qr-code";
import { createClient } from "@/lib/supabase/client";
import type { Photo, ScreenQueue } from "@/types/database";
import { Wifi, WifiOff, Camera, Loader2 } from "lucide-react";

const DISPLAY_TIME_MS = 5000; // 5 seconds per photo
const RECONNECT_BASE_DELAY = 1000; // 1 second base delay
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max delay
const PREFETCH_COUNT = 3; // Number of photos to prefetch
const PING_INTERVAL = 30000; // 30 seconds ping interval

interface ScreenDisplayProps {
  screenId: string;
}

interface QueuedPhoto {
  queueId: string;
  photo: Photo;
  position: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export function ScreenDisplay({ screenId }: ScreenDisplayProps) {
  const [currentPhoto, setCurrentPhoto] = useState<QueuedPhoto | null>(null);
  const [nextPhoto, setNextPhoto] = useState<QueuedPhoto | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [isQueueEmpty, setIsQueueEmpty] = useState(false);
  const [prefetchedUrls, setPrefetchedUrls] = useState<Set<string>>(new Set());

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<QueuedPhoto[]>([]);

  // Fetch next photo from queue
  const fetchNextPhoto = useCallback(async (): Promise<QueuedPhoto | null> => {
    try {
      const supabase = supabaseRef.current;

      // Get the next undisplayed photo from the queue for this screen
      const { data: queueItems, error } = await supabase
        .from("screen_queue")
        .select(`
          id,
          photo_id,
          position,
          displayed_at,
          photos (
            id,
            file_url,
            thumbnail_url,
            status,
            source,
            photographer_id,
            user_name,
            created_at,
            approved_at,
            displayed_count
          )
        `)
        .eq("screen_id", screenId)
        .is("displayed_at", null)
        .order("position", { ascending: true })
        .limit(PREFETCH_COUNT);

      if (error) {
        throw error;
      }

      if (!queueItems || queueItems.length === 0) {
        // No photos in queue for this screen, try global queue
        const { data: globalQueue, error: globalError } = await supabase
          .from("screen_queue")
          .select(`
            id,
            photo_id,
            position,
            displayed_at,
            photos (
              id,
              file_url,
              thumbnail_url,
              status,
              source,
              photographer_id,
              user_name,
              created_at,
              approved_at,
              displayed_count
            )
          `)
          .is("screen_id", null)
          .is("displayed_at", null)
          .order("position", { ascending: true })
          .limit(PREFETCH_COUNT);

        if (globalError) {
          throw globalError;
        }

        if (!globalQueue || globalQueue.length === 0) {
          return null;
        }

        // Store queue for prefetching
        queueRef.current = globalQueue
          .filter((item) => item.photos)
          .map((item) => ({
            queueId: item.id,
            photo: item.photos as unknown as Photo,
            position: item.position,
          }));

        const firstItem = queueRef.current[0];
        return firstItem || null;
      }

      // Store queue for prefetching
      queueRef.current = queueItems
        .filter((item) => item.photos)
        .map((item) => ({
          queueId: item.id,
          photo: item.photos as unknown as Photo,
          position: item.position,
        }));

      const firstItem = queueRef.current[0];
      return firstItem || null;
    } catch {
      return null;
    }
  }, [screenId]);

  // Mark photo as displayed
  const markAsDisplayed = useCallback(async (queueId: string) => {
    try {
      const supabase = supabaseRef.current;

      await supabase
        .from("screen_queue")
        .update({ displayed_at: new Date().toISOString() })
        .eq("id", queueId);

      // Also increment displayed_count on the photo
      const queueItem = queueRef.current.find((q) => q.queueId === queueId);
      if (queueItem) {
        await supabase
          .from("photos")
          .update({ displayed_count: (queueItem.photo.displayed_count || 0) + 1 })
          .eq("id", queueItem.photo.id);
      }
    } catch {
      // Silently fail - display should continue
    }
  }, []);

  // Update screen status (ping)
  const updateScreenStatus = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      await supabase
        .from("screens")
        .update({
          status: "online",
          last_ping: new Date().toISOString(),
        })
        .eq("id", screenId);
    } catch {
      // Silently fail
    }
  }, [screenId]);

  // Prefetch images
  const prefetchImages = useCallback((photos: QueuedPhoto[]) => {
    photos.forEach((item) => {
      if (!prefetchedUrls.has(item.photo.file_url)) {
        const img = document.createElement("img");
        img.src = item.photo.file_url;
        setPrefetchedUrls((prev) => new Set([...prev, item.photo.file_url]));
      }
    });
  }, [prefetchedUrls]);

  // Advance to next photo
  const advanceToNextPhoto = useCallback(async () => {
    // Start transition
    setIsTransitioning(true);

    // Mark current photo as displayed
    if (currentPhoto) {
      await markAsDisplayed(currentPhoto.queueId);
      // Remove from queue
      queueRef.current = queueRef.current.filter(
        (q) => q.queueId !== currentPhoto.queueId
      );
    }

    // Wait for fade out
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get next photo
    let next: QueuedPhoto | null = queueRef.current[0] || null;

    // If queue is depleted, fetch more
    if (!next) {
      next = await fetchNextPhoto();
    }

    if (next) {
      setCurrentPhoto(next);
      setIsQueueEmpty(false);

      // Prefetch upcoming photos
      if (queueRef.current.length > 1) {
        prefetchImages(queueRef.current.slice(1));
      }

      // Prepare next photo reference
      setNextPhoto(queueRef.current[1] || null);
    } else {
      setCurrentPhoto(null);
      setNextPhoto(null);
      setIsQueueEmpty(true);
    }

    // End transition
    setTimeout(() => setIsTransitioning(false), 100);
  }, [currentPhoto, fetchNextPhoto, markAsDisplayed, prefetchImages]);

  // Auto-advance timer
  useEffect(() => {
    if (!currentPhoto || isTransitioning) return;

    displayTimeoutRef.current = setTimeout(() => {
      advanceToNextPhoto();
    }, DISPLAY_TIME_MS);

    return () => {
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
    };
  }, [currentPhoto, isTransitioning, advanceToNextPhoto]);

  // Ref to track if queue is empty (for use in realtime callback)
  const isQueueEmptyRef = useRef(isQueueEmpty);
  useEffect(() => {
    isQueueEmptyRef.current = isQueueEmpty;
  }, [isQueueEmpty]);

  // Initial setup and realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    // Setup realtime subscription
    const setupSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      setConnectionStatus("connecting");

      const channel = supabase
        .channel(`screen-${screenId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "screen_queue",
          },
          (payload) => {
            const newQueueItem = payload.new as ScreenQueue;

            // Check if this is for our screen or global queue
            if (newQueueItem.screen_id === screenId || newQueueItem.screen_id === null) {
              // If queue was empty, fetch the new photo
              if (isQueueEmptyRef.current) {
                fetchNextPhoto().then((photo) => {
                  if (photo) {
                    setCurrentPhoto(photo);
                    setIsQueueEmpty(false);
                  }
                });
              }
            }
          }
        )
        .on("system", { event: "disconnect" }, () => {
          setConnectionStatus("disconnected");
          triggerReconnect();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected");
            reconnectAttemptRef.current = 0;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnectionStatus("disconnected");
            triggerReconnect();
          }
        });

      channelRef.current = channel;
    };

    // Handle reconnection with exponential backoff
    const triggerReconnect = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      setConnectionStatus("reconnecting");

      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY
      );

      reconnectAttemptRef.current += 1;

      reconnectTimeout = setTimeout(() => {
        setupSubscription();
      }, delay);

      reconnectTimeoutRef.current = reconnectTimeout;
    };

    // Setup realtime subscription
    setupSubscription();

    // Fetch initial photo
    fetchNextPhoto().then((photo) => {
      if (photo) {
        setCurrentPhoto(photo);
        setIsQueueEmpty(false);
        // Prefetch next photos
        if (queueRef.current.length > 1) {
          prefetchImages(queueRef.current.slice(1));
        }
        setNextPhoto(queueRef.current[1] || null);
      } else {
        setIsQueueEmpty(true);
      }
    });

    // Update screen status immediately
    updateScreenStatus();

    // Setup ping interval
    pingIntervalRef.current = setInterval(updateScreenStatus, PING_INTERVAL);

    return () => {
      // Cleanup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      // Update screen status to offline
      supabase
        .from("screens")
        .update({ status: "offline" })
        .eq("id", screenId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId]);

  // Get landing page URL for QR code
  const landingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/`
    : "https://carnaval.keepit.com.br/";

  return (
    <div className="dark fixed inset-0 bg-black overflow-hidden">
      {/* Main Photo Display */}
      <div className="relative w-full h-full">
        {currentPhoto ? (
          <div
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              isTransitioning ? "opacity-0" : "opacity-100"
            }`}
          >
            <Image
              src={currentPhoto.photo.file_url}
              alt="Foto do Carnaval"
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        ) : isQueueEmpty ? (
          <EmptyQueuePlaceholder />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Next photo preload (hidden) */}
        {nextPhoto && (
          <div className="hidden">
            <Image
              src={nextPhoto.photo.file_url}
              alt=""
              width={1}
              height={1}
              priority
            />
          </div>
        )}
      </div>

      {/* Branding Overlay - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <KeepitLogo />
      </div>

      {/* QR Code Overlay - Bottom Right */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white rounded-xl p-3 shadow-lg">
          <QRCodeCanvas url={landingUrl} size={120} />
          <p className="text-black text-xs font-medium text-center mt-2">
            Escaneie e participe!
          </p>
        </div>
      </div>

      {/* Connection Status Indicator - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ConnectionStatusIndicator status={connectionStatus} />
      </div>

      {/* Screen ID Badge - Bottom Left */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
          <p className="text-white/50 text-xs font-mono">
            Screen: {screenId}
          </p>
        </div>
      </div>
    </div>
  );
}

// Empty Queue Placeholder Component
function EmptyQueuePlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black via-keepit-dark to-black">
      {/* Large Logo */}
      <div className="mb-8">
        <KeepitLogo size="large" />
      </div>

      {/* Animated Camera Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Camera className="w-12 h-12 text-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Message */}
      <h2 className="text-white text-3xl font-bold mb-3 text-center">
        Aguardando fotos...
      </h2>
      <p className="text-white/60 text-lg text-center max-w-md">
        As fotos do Carnaval aparecerao aqui em breve!
      </p>

      {/* Animated Dots */}
      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// Keepit Logo Component
function KeepitLogo({ size = "normal" }: { size?: "normal" | "large" }) {
  const isLarge = size === "large";

  return (
    <div
      className={`flex items-center gap-2 ${
        isLarge ? "scale-150" : ""
      }`}
    >
      <div
        className={`bg-emerald-500 rounded-lg flex items-center justify-center ${
          isLarge ? "w-16 h-16" : "w-12 h-12"
        }`}
      >
        <span
          className={`font-bold text-black ${
            isLarge ? "text-2xl" : "text-lg"
          }`}
        >
          K
        </span>
      </div>
      <div>
        <p
          className={`font-bold text-white ${
            isLarge ? "text-3xl" : "text-xl"
          }`}
        >
          Keepit
        </p>
        <p
          className={`text-emerald-500 font-medium ${
            isLarge ? "text-base" : "text-xs"
          }`}
        >
          Carnaval 2026
        </p>
      </div>
    </div>
  );
}

// Connection Status Indicator
function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connecting: {
      icon: <Wifi className="w-4 h-4 animate-pulse" />,
      color: "text-yellow-500",
      bg: "bg-yellow-500/20",
    },
    connected: {
      icon: <Wifi className="w-4 h-4" />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/20",
    },
    disconnected: {
      icon: <WifiOff className="w-4 h-4" />,
      color: "text-red-500",
      bg: "bg-red-500/20",
    },
    reconnecting: {
      icon: <Wifi className="w-4 h-4 animate-pulse" />,
      color: "text-orange-500",
      bg: "bg-orange-500/20",
    },
  };

  const { icon, color, bg } = config[status];

  return (
    <div
      className={`${bg} backdrop-blur-sm rounded-full p-2 border border-white/10 ${color}`}
    >
      {icon}
    </div>
  );
}
