"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface SharedHeaderProps {
  title?: string;
  badge?: string;
  badgeVariant?: "default" | "outline";
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function SharedHeader({
  title,
  badge,
  badgeVariant = "outline",
  showBack = true,
  backHref = "/hub",
  rightAction,
}: SharedHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: Back + Logo */}
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(backHref)}
              className="text-keepit-dark/60 hover:text-keepit-dark"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="text-xl font-black tracking-tighter text-keepit-dark">
            KEEPIT
          </span>
          {title && (
            <>
              <span className="text-keepit-dark/20 font-light">|</span>
              <span className="text-sm font-medium text-keepit-dark/60">
                {title}
              </span>
            </>
          )}
        </div>

        {/* Right: Badge or custom action */}
        <div className="flex items-center gap-3">
          {badge && (
            <Badge
              variant={badgeVariant}
              className="border-keepit-emerald/30 text-keepit-emerald"
            >
              {badge}
            </Badge>
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
}
