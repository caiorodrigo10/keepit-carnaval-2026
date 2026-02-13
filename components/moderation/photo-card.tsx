"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Ban,
  Clock,
  User,
  Camera,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { Photo } from "@/types/database";

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onBlock: (id: string) => Promise<void>;
  isFocused?: boolean;
}

/**
 * Calculate time in queue
 */
function getTimeInQueue(createdAt: string): { text: string; overSLA: boolean } {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return { text: "Agora", overSLA: false };
  }
  if (diffMinutes < 60) {
    return { text: `${diffMinutes}m`, overSLA: diffMinutes >= 5 };
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return {
    text: `${hours}h ${minutes}m`,
    overSLA: true,
  };
}

export function PhotoCard({
  photo,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onBlock,
  isFocused,
}: PhotoCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [timeInQueue, setTimeInQueue] = useState(() =>
    getTimeInQueue(photo.created_at)
  );

  // Update time in queue every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInQueue(getTimeInQueue(photo.created_at));
    }, 60000);
    return () => clearInterval(interval);
  }, [photo.created_at]);

  async function handleApprove() {
    setIsLoading("approve");
    try {
      await onApprove(photo.id);
    } finally {
      setIsLoading(null);
    }
  }

  async function handleReject() {
    setIsLoading("reject");
    try {
      await onReject(photo.id);
    } finally {
      setIsLoading(null);
    }
  }

  async function handleBlock() {
    setIsLoading("block");
    try {
      await onBlock(photo.id);
    } finally {
      setIsLoading(null);
    }
  }

  const isProcessing = isLoading !== null;
  const imageUrl = photo.thumbnail_url || photo.file_url;

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isFocused
          ? "ring-2 ring-keepit-brand ring-offset-2"
          : isSelected
            ? "ring-2 ring-primary/50"
            : ""
      }`}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(photo.id, checked === true)}
          disabled={isProcessing}
          className="bg-white/90 border-gray-300"
        />
      </div>

      {/* Time in queue badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge
          variant={timeInQueue.overSLA ? "destructive" : "secondary"}
          className="gap-1"
        >
          {timeInQueue.overSLA && <AlertTriangle className="h-3 w-3" />}
          <Clock className="h-3 w-3" />
          {timeInQueue.text}
        </Badge>
      </div>

      {/* Photo */}
      <div className="aspect-square relative bg-muted">
        <Image
          src={imageUrl}
          alt="Foto pendente"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          loading="lazy"
        />
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="gap-1">
            {photo.source === "photographer" ? (
              <>
                <Camera className="h-3 w-3" />
                Fotografo
              </>
            ) : (
              <>
                <User className="h-3 w-3" />
                Usuario
              </>
            )}
          </Badge>
          {photo.user_name && (
            <span className="text-muted-foreground truncate text-xs">
              {photo.user_name}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {new Date(photo.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isLoading === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                <span className="sr-only sm:not-sr-only">A</span>
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={handleReject}
            disabled={isProcessing}
          >
            {isLoading === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                <span className="sr-only sm:not-sr-only">R</span>
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50"
            onClick={handleBlock}
            disabled={isProcessing || !photo.user_email}
            title={!photo.user_email ? "Usuario sem email" : "Bloquear usuario"}
          >
            {isLoading === "block" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
