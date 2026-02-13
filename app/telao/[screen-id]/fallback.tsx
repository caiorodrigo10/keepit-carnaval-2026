"use client";

import { Loader2 } from "lucide-react";

export function ScreenLoadingFallback() {
  return (
    <div className="dark fixed inset-0 bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
        <p className="text-white/70 text-lg font-medium">Carregando telao...</p>
      </div>
    </div>
  );
}
